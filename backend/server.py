"""
Clancy's Restaurant — single-tenant loyalty + full Owner Admin backend.
FastAPI + MongoDB + Google Sign-In + notificaciones push.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Header, BackgroundTasks, Depends, Query, UploadFile, File, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal, Any
from pathlib import Path
from datetime import datetime, timedelta, timezone
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_auth_requests
import os, logging, uuid, secrets, time, bcrypt, jwt, httpx, asyncio, json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = os.environ["JWT_ALGORITHM"]
JWT_EXP_DAYS = int(os.environ["JWT_EXP_DAYS"])
PUSH_KEY = os.environ.get("PUSH_KEY", "placeholder")
PUSH_BASE_URL = os.environ["PUSH_BASE_URL"]
# Google OAuth Client ID(s) allowed to sign in (comma-separated if you have web+ios+android
# clients). Create these at https://console.cloud.google.com/apis/credentials — no client
# secret needed, we only verify the signed ID token Google's own servers issued.
GOOGLE_CLIENT_IDS = [c.strip() for c in os.environ.get("GOOGLE_CLIENT_IDS", "").split(",") if c.strip()]
_google_auth_request = google_auth_requests.Request()

# Browser origins allowed to call this API, comma-separated in the environment.
# A wildcard is not an option here: the app sends credentials, and a browser
# refuses "*" on a credentialed request, so "*" was never really working. Only
# the web build is affected — a native app sends no Origin header at all.
# Left empty, it falls back to the local dev servers so a fresh clone runs.
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
CORS_FALLBACK = ["http://localhost:8081", "http://localhost:19006", "http://127.0.0.1:8081"]

# Passwords for the three staff accounts created on a first run. They live in the
# environment, never in this file: a password committed to a repository is a
# password everyone with the repository has. Only read when the seed actually
# runs, so an existing install does not need them set.
SEED_PASSWORDS = {
    "owner": os.environ.get("SEED_OWNER_PASSWORD"),
    "manager": os.environ.get("SEED_MANAGER_PASSWORD"),
    "waiter": os.environ.get("SEED_WAITER_PASSWORD"),
}

# Single restaurant — Clancy's
RESTAURANT_ID = "clancys"
SERVICE_ORDER = ["Breakfast", "Lunch", "Dinner", "Dessert"]
MENU_SEED = ROOT_DIR / "data" / "menu.clancys-cork.json"

def menu_seed_docs():
    """The real Clancy's Cork menu, transcribed from the client's own text.
    Order is the file's order: the house's service order, then course order,
    then the order dishes appear on the printed menu."""
    data = json.loads(MENU_SEED.read_text(encoding="utf-8"))
    n = 0
    for svc in data["services"]:
        for course in svc["courses"]:
            for it in course["items"]:
                n += 1
                yield {"item_id": gen_id("itm"), "category": svc["service"], "course": course["course"],
                       "name": it["name"], "description": it["description"], "price": it["price"],
                       "image_url": None, "available": True, "order": n, "created_at": now_utc()}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
logger = logging.getLogger("clancys")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)

# ---------- Rate limiting ----------
# Ventana deslizante en memoria. Alcanza porque el backend corre como un solo
# proceso; con varias instancias detrás de un balanceador cada una llevaría su
# propia cuenta y habría que mover esto a Redis.
#
# El login se limita por intentos FALLIDOS: a quien escribe bien la contraseña
# no se le cuenta nada, así que un cliente legítimo nunca choca con el límite.
# El escaneo se limita por llamadas, porque ahí lo que se frena es probar
# tokens al voleo.
LOGIN_MAX_INTENTOS, LOGIN_VENTANA_S = 5, 900      # 5 fallos cada 15 minutos
SCAN_MAX_LLAMADAS, SCAN_VENTANA_S = 20, 60        # 20 escaneos por minuto

_intentos: dict[str, list[float]] = {}


def _rate_espera(clave: str, maximo: int, ventana_s: int) -> Optional[int]:
    """Segundos que faltan para reintentar, o None si todavía puede pasar."""
    ahora = time.monotonic()
    marcas = [t for t in _intentos.get(clave, []) if ahora - t < ventana_s]
    _intentos[clave] = marcas
    if len(marcas) < maximo:
        return None
    return int(ventana_s - (ahora - marcas[0])) + 1


def _rate_anotar(clave: str, ventana_s: int) -> None:
    ahora = time.monotonic()
    marcas = [t for t in _intentos.get(clave, []) if ahora - t < ventana_s]
    marcas.append(ahora)
    _intentos[clave] = marcas


def _rate_limpiar(clave: str) -> None:
    _intentos.pop(clave, None)


def _rate_frenar(clave: str, maximo: int, ventana_s: int) -> None:
    """Corta con 429 si la clave se pasó del límite."""
    espera = _rate_espera(clave, maximo, ventana_s)
    if espera is not None:
        raise HTTPException(429, "Demasiados intentos. Probá de nuevo en un rato.",
                            headers={"Retry-After": str(espera)})


def _ip_de(request: Optional[Request]) -> str:
    if request is None:
        return "desconocida"
    return (request.client.host if request.client else None) or "desconocida"


# ---------- Helpers ----------
def now_utc() -> datetime: return datetime.now(timezone.utc)
def gen_id(p="id") -> str: return f"{p}_{uuid.uuid4().hex[:12]}"
def hash_password(pw: str) -> str: return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def verify_password(pw: str, h: str) -> bool:
    try: return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception: return False
def create_jwt(user_id: str) -> str:
    return jwt.encode({
        "sub": user_id,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(days=JWT_EXP_DAYS)).timestamp()),
    }, JWT_SECRET, algorithm=JWT_ALGO)

def decode_jwt(token: str) -> Optional[str]:
    try: return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO]).get("sub")
    except Exception: return None

ADMIN_ROLES = {"owner", "manager"}          # the office: dashboard, menu, rewards, promos, customers
FLOOR_ROLES = {"waiter", "host"}            # the floor: scan, deliver
STAFF_ROLES = ADMIN_ROLES | FLOOR_ROLES     # everyone the owner manages in Staff
STAFF_QR_ROLES = STAFF_ROLES

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1].strip()
    user = None
    uid = decode_jwt(token)
    if uid:
        user = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
    if not user:
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if exp and exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp < now_utc(): raise HTTPException(401, "Session expired")
            user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user: raise HTTPException(401, "Invalid token")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(403, "Admin access required")
    return user

async def require_owner(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "owner":
        raise HTTPException(403, "Owner access required")
    return user

async def log_activity(user_id: str, action: str, target: Optional[str] = None, meta: Optional[dict] = None):
    await db.activity_log.insert_one({
        "log_id": gen_id("log"),
        "user_id": user_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "created_at": now_utc(),
    })

async def send_push(recipients: List[str], data: dict, idempotency_key: Optional[str] = None):
    if not recipients: return
    payload = {"recipients": recipients[:200], "data": data}
    if idempotency_key: payload["$idempotency_key"] = idempotency_key
    try:
        r = await push_client.post("/api/v1/push/trigger", json=payload)
        if r.status_code >= 400:
            logger.warning(f"Push failed ({r.status_code}): {r.text[:200]}")
    except Exception as e:
        logger.warning(f"Push error (non-blocking): {e}")

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr; password: str = Field(min_length=6); name: str
class LoginIn(BaseModel):
    email: EmailStr; password: str
class GoogleLoginIn(BaseModel):
    id_token: str
    nonce: Optional[str] = None
class GenerateQRIn(BaseModel):
    purpose: Literal["visit", "redeem"] = "visit"
    reward_id: Optional[str] = None
class ScanQRIn(BaseModel):
    token: str
class RewardUpsertIn(BaseModel):
    name: str; description: str
    visits_required: int = Field(ge=1, le=50)
    image_url: Optional[str] = None
    reward_type: Literal["dessert", "drink", "tasting", "discount", "exclusive", "birthday"] = "dessert"
    value: Optional[str] = None
    expires_days: int = Field(default=30, ge=1, le=365)
    active: bool = True
class PromotionUpsertIn(BaseModel):
    title: str; description: str
    image_url: Optional[str] = None
    banner_color: Optional[str] = "#0E5C3A"
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    push_on_publish: bool = False
    active: bool = True
class MenuItemUpsertIn(BaseModel):
    # Category = service (Breakfast / Lunch / Dinner / Dessert); course = the
    # heading inside it (Starters, Mains, Sides...). Both are data, not code, so
    # the house can add a Sunday roast menu without a rebuild.
    category: str = Field(min_length=1)
    course: Optional[str] = None
    name: str; description: Optional[str] = None
    price: float; image_url: Optional[str] = None
    available: bool = True
    order: int = 0
class StaffCreateIn(BaseModel):
    email: EmailStr; name: str
    role: Literal["manager", "host", "waiter"]
    password: str = Field(min_length=6)
class StaffUpdateIn(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["manager", "host", "waiter"]] = None
    active: Optional[bool] = None
class RegisterPushBody(BaseModel):
    platform: str; device_token: str

# ---------- App ----------
app = FastAPI(title="Clancy's Loyalty + Admin")
api = APIRouter(prefix="/api")

@api.get("/")
async def root(): return {"service": "clancys-loyalty", "status": "ok"}
@api.get("/health")
async def health(): return {"status": "ok", "time": now_utc().isoformat()}

# ---------- AUTH ----------
def _user_payload(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u["name"],
        "role": u.get("role", "customer"),
        "picture": u.get("picture"),
        "active": u.get("active", True),
        "created_at": u["created_at"].isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }

@api.post("/auth/register")
async def auth_register(body: RegisterIn):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already registered")
    uid = gen_id("usr")
    doc = {
        "user_id": uid, "email": body.email.lower(), "name": body.name,
        "password_hash": hash_password(body.password),
        "picture": None, "role": "customer", "active": True,
        "auth_provider": "email", "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    await db.memberships.insert_one({
        "membership_id": gen_id("mem"), "user_id": uid,
        "visits": 0, "lifetime_visits": 0, "joined_at": now_utc(),
    })
    return {"token": create_jwt(uid), "user": _user_payload(doc)}

@api.post("/auth/login")
async def auth_login(body: LoginIn, request: Request = None):
    # Por IP y correo a la vez: así un atacante no bloquea la cuenta de otro
    # desde afuera, y tampoco le sirve ir probando correo por correo.
    clave = f"login:{_ip_de(request)}:{body.email.lower()}"
    _rate_frenar(clave, LOGIN_MAX_INTENTOS, LOGIN_VENTANA_S)

    u = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not u or not u.get("password_hash") or not verify_password(body.password, u["password_hash"]):
        _rate_anotar(clave, LOGIN_VENTANA_S)
        raise HTTPException(401, "Invalid credentials")
    if not u.get("active", True):
        raise HTTPException(403, "Account disabled")
    _rate_limpiar(clave)
    return {"token": create_jwt(u["user_id"]), "user": _user_payload(u)}

@api.post("/auth/google")
async def auth_google(body: GoogleLoginIn):
    """Verify a Google-issued ID token straight against Google's own public keys
    (via the `google-auth` library) and sign the user into our own JWT session.
    No third-party auth proxy involved — the browser/app talks to Google directly."""
    if not GOOGLE_CLIENT_IDS:
        raise HTTPException(500, "Google sign-in is not configured (set GOOGLE_CLIENT_IDS in backend/.env)")
    try:
        idinfo = await asyncio.to_thread(google_id_token.verify_oauth2_token, body.id_token, _google_auth_request)
    except Exception:
        raise HTTPException(401, "Invalid Google token")
    if idinfo.get("aud") not in GOOGLE_CLIENT_IDS:
        raise HTTPException(401, "Google token audience mismatch")
    if body.nonce and idinfo.get("nonce") != body.nonce:
        raise HTTPException(401, "Google token nonce mismatch")
    if idinfo.get("email_verified") is False:
        raise HTTPException(401, "Google email is not verified")
    email = idinfo["email"].lower(); name = idinfo.get("name") or email.split("@")[0]
    pic = idinfo.get("picture")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        uid = existing["user_id"]
        await db.users.update_one({"user_id": uid}, {"$set": {"name": name, "picture": pic}})
    else:
        uid = gen_id("usr")
        await db.users.insert_one({
            "user_id": uid, "email": email, "name": name, "picture": pic,
            "password_hash": None, "role": "customer", "active": True,
            "auth_provider": "google", "created_at": now_utc(),
        })
        await db.memberships.insert_one({
            "membership_id": gen_id("mem"), "user_id": uid,
            "visits": 0, "lifetime_visits": 0, "joined_at": now_utc(),
        })
    u = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
    return {"token": create_jwt(uid), "user": _user_payload(u)}

@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)): return _user_payload(user)

@api.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"status": "ok"}

# ---------- RESTAURANT INFO ----------
@api.get("/restaurant")
async def get_restaurant():
    r = await db.restaurant.find_one({"_id": RESTAURANT_ID})
    if not r: raise HTTPException(404, "Restaurant not configured")
    r.pop("_id", None)
    return r

# ---------- LOYALTY (visit-based) ----------
@api.get("/loyalty")
async def get_loyalty(user: dict = Depends(get_current_user)):
    m = await db.memberships.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not m:
        m = {"membership_id": gen_id("mem"), "user_id": user["user_id"],
             "visits": 0, "lifetime_visits": 0, "joined_at": now_utc()}
        await db.memberships.insert_one(m)
        m.pop("_id", None)
    rewards = await db.rewards.find({"active": True}, {"_id": 0}).sort("visits_required", 1).to_list(100)
    visits = m.get("visits", 0)
    next_reward = next((r for r in rewards if r["visits_required"] > visits), rewards[-1] if rewards else None)
    return {"visits": visits, "lifetime_visits": m.get("lifetime_visits", 0),
            "rewards": rewards, "next_reward": next_reward}

@api.get("/rewards")
async def list_rewards():
    items = await db.rewards.find({"active": True}, {"_id": 0}).sort("visits_required", 1).to_list(100)
    return items

@api.get("/redemptions")
async def my_redemptions(user: dict = Depends(get_current_user)):
    items = await db.redemptions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("redeemed_at", -1).to_list(100)
    return items

# ---------- QR ----------
@api.post("/qr/generate")
async def gen_qr(body: GenerateQRIn, user: dict = Depends(get_current_user)):
    if user.get("role") != "customer":
        raise HTTPException(403, "Only customers can generate QR codes")
    token = secrets.token_urlsafe(24)
    doc = {
        "qr_id": gen_id("qr"), "token": token, "user_id": user["user_id"],
        "purpose": body.purpose, "reward_id": body.reward_id,
        "expires_at": now_utc() + timedelta(seconds=180),
        "used": False, "created_at": now_utc(),
    }
    await db.qr_tokens.insert_one(doc)
    return {"token": token, "expires_at": doc["expires_at"].isoformat(), "purpose": body.purpose}

@api.post("/qr/scan")
async def scan_qr(body: ScanQRIn, user: dict = Depends(get_current_user),
                  background: BackgroundTasks = None, request: Request = None):
    if user.get("role") not in STAFF_QR_ROLES:
        raise HTTPException(403, "Staff only")
    # Por empleado, no por IP: en el local todos salen por la misma conexión.
    clave = f"scan:{user['user_id']}"
    _rate_frenar(clave, SCAN_MAX_LLAMADAS, SCAN_VENTANA_S)
    _rate_anotar(clave, SCAN_VENTANA_S)
    qr = await db.qr_tokens.find_one({"token": body.token}, {"_id": 0})
    if not qr: raise HTTPException(400, "Invalid QR token")
    if qr.get("used"): raise HTTPException(400, "QR already used")
    exp = qr.get("expires_at")
    if exp and exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < now_utc(): raise HTTPException(400, "QR expired")

    cust_id = qr["user_id"]
    await db.qr_tokens.update_one({"token": body.token},
        {"$set": {"used": True, "used_at": now_utc(), "scanned_by": user["user_id"]}})

    if qr["purpose"] == "visit":
        await db.memberships.update_one(
            {"user_id": cust_id},
            {"$inc": {"visits": 1, "lifetime_visits": 1}, "$set": {"updated_at": now_utc()}},
            upsert=True,
        )
        await db.visit_log.insert_one({
            "visit_id": gen_id("vst"), "user_id": cust_id,
            "staff_id": user["user_id"], "created_at": now_utc(),
        })
        m = await db.memberships.find_one({"user_id": cust_id}, {"_id": 0})
        new_visits = m["visits"]
        rewards = await db.rewards.find({"active": True}, {"_id": 0}).sort("visits_required", 1).to_list(100)
        unlocked = [r for r in rewards if r["visits_required"] == new_visits]
        if unlocked and background:
            background.add_task(send_push, [cust_id], {
                "title": "🎉 Reward unlocked at Clancy's",
                "message": f"You've earned: {unlocked[0]['name']}",
                "action_url": "/(tabs)/rewards",
            })
        await log_activity(user["user_id"], "visit_added", target=cust_id, meta={"visits": new_visits})
        # Same goal rule as /loyalty: the next reward above the new count, else the top one.
        goal = next((r["visits_required"] for r in rewards if r["visits_required"] > new_visits),
                    rewards[-1]["visits_required"] if rewards else None)
        result = {"status": "ok", "kind": "visit", "customer": await _customer_card(cust_id),
                  "visits": new_visits, "goal": goal,
                  "unlocked": [{"reward_id": r["reward_id"], "name": r["name"]} for r in unlocked]}
        # The guest's own screen polls the token: leave the outcome on it.
        await db.qr_tokens.update_one({"token": body.token}, {"$set": {"result": result}})
        return result

    if qr["purpose"] == "redeem":
        reward = await db.rewards.find_one({"reward_id": qr.get("reward_id"), "active": True}, {"_id": 0})
        if not reward: raise HTTPException(404, "Reward not found")
        m = await db.memberships.find_one({"user_id": cust_id}, {"_id": 0})
        if not m or m.get("visits", 0) < reward["visits_required"]:
            raise HTTPException(400, "Not enough visits")
        await db.memberships.update_one({"user_id": cust_id},
            {"$inc": {"visits": -reward["visits_required"]}, "$set": {"updated_at": now_utc()}})
        # Two steps, by the house's rule: the scan reserves the reward, and the
        # person who carries it to the table confirms delivery. Until then it is
        # pending, and the guest sees it as pending.
        red = {
            "redemption_id": gen_id("red"), "user_id": cust_id,
            "reward_id": reward["reward_id"], "reward_name": reward["name"],
            "visits_spent": reward["visits_required"], "staff_id": user["user_id"],
            "redeemed_at": now_utc(), "status": "pending", "delivered_at": None, "delivered_by": None,
        }
        await db.redemptions.insert_one(red); red.pop("_id", None)
        await log_activity(user["user_id"], "reward_redeemed", target=cust_id,
                           meta={"reward": reward["name"]})
        result = {"status": "pending", "kind": "redeem", "customer": await _customer_card(cust_id),
                  "redemption_id": red["redemption_id"], "reward": reward["name"],
                  "visits_spent": reward["visits_required"]}
        await db.qr_tokens.update_one({"token": body.token}, {"$set": {"result": result}})
        return result
    raise HTTPException(400, "Unknown purpose")

async def _customer_card(user_id: str) -> dict:
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "user_id": 1})
    return {"user_id": user_id, "name": (u or {}).get("name") or "Guest"}

@api.post("/redemptions/{rid}/deliver")
async def deliver_redemption(rid: str, user: dict = Depends(get_current_user), background: BackgroundTasks = None):
    """Step two of a redemption: the reward reached the table."""
    if user.get("role") not in STAFF_QR_ROLES:
        raise HTTPException(403, "Staff only")
    red = await db.redemptions.find_one({"redemption_id": rid}, {"_id": 0})
    if not red: raise HTTPException(404, "Redemption not found")
    if red.get("status") == "delivered":
        return red  # idempotent: a second tap is not a second delivery
    await db.redemptions.update_one({"redemption_id": rid},
        {"$set": {"status": "delivered", "delivered_at": now_utc(), "delivered_by": user["user_id"]}})
    red = await db.redemptions.find_one({"redemption_id": rid}, {"_id": 0})
    if background:
        background.add_task(send_push, [red["user_id"]], {
            "title": "Enjoy — on the house",
            "message": f"Your {red['reward_name']} is on its way. Sláinte.",
            "action_url": "/(tabs)/rewards",
        })
    await log_activity(user["user_id"], "reward_delivered", target=red["user_id"], meta={"reward": red["reward_name"]})
    return red

@api.get("/qr/status/{token}")
async def qr_status(token: str, user: dict = Depends(get_current_user)):
    """The guest's screen asks whether the code it is showing has been read yet."""
    qr = await db.qr_tokens.find_one({"token": token, "user_id": user["user_id"]}, {"_id": 0})
    if not qr: raise HTTPException(404, "Unknown token")
    return {"used": bool(qr.get("used")), "purpose": qr.get("purpose"), "result": qr.get("result")}

# ---------- PROMOTIONS (public read) ----------
@api.get("/promotions")
async def list_promotions():
    now = now_utc()
    items = await db.promotions.find({"active": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    out = []
    for p in items:
        vu = p.get("valid_until")
        if vu:
            if vu.tzinfo is None: vu = vu.replace(tzinfo=timezone.utc)
            if vu < now: continue
        out.append(p)
    return out

# ---------- MENU (public read) ----------
@api.get("/menu")
async def get_menu():
    items = await db.menu_items.find({"available": True}, {"_id": 0}).sort("order", 1).to_list(500)
    by_cat: dict = {}
    for it in items: by_cat.setdefault(it["category"], []).append(it)
    # The four services lead in the order the house serves them; anything the
    # admin adds beyond that follows alphabetically rather than vanishing.
    cats = [c for c in SERVICE_ORDER if by_cat.get(c)] + sorted(c for c in by_cat if c not in SERVICE_ORDER)
    out = []
    for c in cats:
        courses: dict = {}
        for it in by_cat[c]: courses.setdefault(it.get("course"), []).append(it)
        out.append({"category": c, "items": by_cat[c],
                    "courses": [{"course": k, "items": v} for k, v in courses.items()]})
    return out

# ---------- PUSH ----------
@api.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, user: dict = Depends(get_current_user)):
    try:
        r = await push_client.post("/api/v1/push/users/register",
            json={"user_id": user["user_id"], "platform": body.platform, "device_token": body.device_token})
        await db.push_tokens.update_one(
            {"user_id": user["user_id"], "device_token": body.device_token},
            {"$set": {"user_id": user["user_id"], "platform": body.platform,
                      "device_token": body.device_token, "updated_at": now_utc()}},
            upsert=True)
        if r.status_code >= 400:
            return {"status": "deferred"}
        return {"status": "registered"}
    except Exception as e:
        logger.warning(f"push register error: {e}")
        return {"status": "deferred"}

# ===================== ADMIN ROUTES =====================
admin = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])

# ---------- DASHBOARD ----------
@admin.get("/dashboard")
async def admin_dashboard():
    today = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    [total_customers, active_members, redemptions, today_visits,
     week_visits, week_redemptions] = await _gather_metrics(today, week_ago)

    # daily visits last 7d
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    daily = await db.visit_log.aggregate(pipeline).to_list(7)
    daily_series = [{"date": d["_id"], "count": d["count"]} for d in daily]

    # top rewards last 30d
    pipeline2 = [
        {"$match": {"redeemed_at": {"$gte": today - timedelta(days=30)}}},
        {"$group": {"_id": "$reward_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_rewards = await db.redemptions.aggregate(pipeline2).to_list(5)

    return {
        "total_customers": total_customers,
        "active_members": active_members,
        "rewards_redeemed_total": redemptions,
        "today_visits": today_visits,
        "week_visits": week_visits,
        "week_redemptions": week_redemptions,
        "daily_visits_series": daily_series,
        "top_rewards": [{"name": t["_id"], "count": t["count"]} for t in top_rewards],
    }

async def _gather_metrics(today, week_ago):
    return [
        await db.users.count_documents({"role": "customer"}),
        await db.memberships.count_documents({"lifetime_visits": {"$gt": 0}}),
        await db.redemptions.count_documents({}),
        await db.visit_log.count_documents({"created_at": {"$gte": today}}),
        await db.visit_log.count_documents({"created_at": {"$gte": week_ago}}),
        await db.redemptions.count_documents({"redeemed_at": {"$gte": week_ago}}),
    ]

# ---------- REWARDS MGMT ----------
@admin.get("/rewards")
async def admin_list_rewards():
    return await db.rewards.find({}, {"_id": 0}).sort("visits_required", 1).to_list(200)

@admin.post("/rewards")
async def admin_create_reward(body: RewardUpsertIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"reward_id": gen_id("rwd"), "created_at": now_utc()})
    await db.rewards.insert_one(doc); doc.pop("_id", None)
    await log_activity(user["user_id"], "reward_created", target=doc["reward_id"], meta={"name": doc["name"]})
    return doc

@admin.patch("/rewards/{rid}")
async def admin_update_reward(rid: str, body: RewardUpsertIn, user: dict = Depends(get_current_user)):
    await db.rewards.update_one({"reward_id": rid}, {"$set": {**body.model_dump(), "updated_at": now_utc()}})
    await log_activity(user["user_id"], "reward_updated", target=rid)
    out = await db.rewards.find_one({"reward_id": rid}, {"_id": 0})
    return out

@admin.delete("/rewards/{rid}")
async def admin_delete_reward(rid: str, user: dict = Depends(get_current_user)):
    await db.rewards.delete_one({"reward_id": rid})
    await log_activity(user["user_id"], "reward_deleted", target=rid)
    return {"status": "deleted"}

# ---------- PROMOTIONS MGMT ----------
@admin.get("/promotions")
async def admin_list_promotions():
    return await db.promotions.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@admin.post("/promotions")
async def admin_create_promo(body: PromotionUpsertIn, user: dict = Depends(get_current_user), background: BackgroundTasks = None):
    doc = body.model_dump()
    doc.update({"promotion_id": gen_id("prm"), "created_at": now_utc()})
    await db.promotions.insert_one(doc); doc.pop("_id", None)
    await log_activity(user["user_id"], "promotion_created", target=doc["promotion_id"], meta={"title": doc["title"]})
    if body.push_on_publish and background:
        customer_ids = [u["user_id"] async for u in db.users.find({"role": "customer"}, {"user_id": 1, "_id": 0})]
        background.add_task(send_push, customer_ids, {
            "title": f"✨ {body.title}", "message": body.description[:140],
            "action_url": "/(tabs)",
        })
    return doc

@admin.patch("/promotions/{pid}")
async def admin_update_promo(pid: str, body: PromotionUpsertIn, user: dict = Depends(get_current_user)):
    await db.promotions.update_one({"promotion_id": pid},
        {"$set": {**body.model_dump(), "updated_at": now_utc()}})
    await log_activity(user["user_id"], "promotion_updated", target=pid)
    return await db.promotions.find_one({"promotion_id": pid}, {"_id": 0})

@admin.delete("/promotions/{pid}")
async def admin_delete_promo(pid: str, user: dict = Depends(get_current_user)):
    await db.promotions.delete_one({"promotion_id": pid})
    await log_activity(user["user_id"], "promotion_deleted", target=pid)
    return {"status": "deleted"}

# ---------- MENU MGMT ----------
@admin.get("/menu")
async def admin_list_menu():
    return await db.menu_items.find({}, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(500)

@admin.post("/menu")
async def admin_create_item(body: MenuItemUpsertIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"item_id": gen_id("itm"), "created_at": now_utc()})
    await db.menu_items.insert_one(doc); doc.pop("_id", None)
    await log_activity(user["user_id"], "menu_item_created", target=doc["item_id"], meta={"name": doc["name"]})
    return doc

@admin.patch("/menu/{iid}")
async def admin_update_item(iid: str, body: MenuItemUpsertIn, user: dict = Depends(get_current_user)):
    await db.menu_items.update_one({"item_id": iid},
        {"$set": {**body.model_dump(), "updated_at": now_utc()}})
    await log_activity(user["user_id"], "menu_item_updated", target=iid)
    return await db.menu_items.find_one({"item_id": iid}, {"_id": 0})

@admin.delete("/menu/{iid}")
async def admin_delete_item(iid: str, user: dict = Depends(get_current_user)):
    await db.menu_items.delete_one({"item_id": iid})
    await log_activity(user["user_id"], "menu_item_deleted", target=iid)
    return {"status": "deleted"}

# ---------- IMAGE UPLOADS ----------
# Pictures come off the owner's phone, so they are stored as files on disk and
# referenced by a relative path. Relative on purpose: the dev machine answers to
# localhost, to a LAN address, and one day to a real host, and an absolute URL
# baked into the database would break on every one of those moves.
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
UPLOAD_TYPES = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


@admin.post("/uploads")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = UPLOAD_TYPES.get((file.content_type or "").lower())
    if not ext:
        raise HTTPException(400, "Only JPEG, PNG or WebP images")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "That image is over 8 MB. Please pick a smaller one.")
    if not data:
        raise HTTPException(400, "That file is empty")
    name = f"{gen_id('img')}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    await log_activity(user["user_id"], "image_uploaded", target=name, meta={"bytes": len(data)})
    return {"url": f"/api/uploads/{name}", "bytes": len(data)}


# ---------- STAFF MGMT ----------
@admin.get("/staff", dependencies=[Depends(require_owner)])
async def admin_list_staff():
    items = await db.users.find({"role": {"$in": list(STAFF_ROLES)}},
        {"_id": 0, "password_hash": 0}).sort("created_at", 1).to_list(200)
    return items

@admin.post("/staff", dependencies=[Depends(require_owner)])
async def admin_create_staff(body: StaffCreateIn, user: dict = Depends(get_current_user)):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already in use")
    uid = gen_id("usr")
    doc = {
        "user_id": uid, "email": body.email.lower(), "name": body.name,
        "password_hash": hash_password(body.password),
        "role": body.role, "active": True, "auth_provider": "email",
        "created_at": now_utc(), "created_by": user["user_id"],
    }
    await db.users.insert_one(doc); doc.pop("_id", None); doc.pop("password_hash", None)
    await log_activity(user["user_id"], "staff_created", target=uid,
                       meta={"name": body.name, "role": body.role})
    return doc

@admin.patch("/staff/{uid}", dependencies=[Depends(require_owner)])
async def admin_update_staff(uid: str, body: StaffUpdateIn, user: dict = Depends(get_current_user)):
    set_ = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not set_: raise HTTPException(400, "No changes")
    await db.users.update_one({"user_id": uid, "role": {"$in": list(STAFF_ROLES)}},
        {"$set": {**set_, "updated_at": now_utc()}})
    await log_activity(user["user_id"], "staff_updated", target=uid, meta=set_)
    return await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})

@admin.delete("/staff/{uid}", dependencies=[Depends(require_owner)])
async def admin_delete_staff(uid: str, user: dict = Depends(get_current_user)):
    if uid == user["user_id"]: raise HTTPException(400, "Cannot delete yourself")
    await db.users.update_one({"user_id": uid, "role": {"$in": list(STAFF_ROLES)}},
        {"$set": {"active": False, "deleted_at": now_utc()}})
    await log_activity(user["user_id"], "staff_disabled", target=uid)
    return {"status": "disabled"}

# ---------- CUSTOMERS LIST ----------
@admin.get("/customers")
async def admin_list_customers(limit: int = 100):
    users = await db.users.find({"role": "customer"},
        {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    uids = [u["user_id"] for u in users]
    mems = {m["user_id"]: m async for m in db.memberships.find(
        {"user_id": {"$in": uids}}, {"_id": 0})}
    for u in users:
        m = mems.get(u["user_id"])
        u["visits"] = m.get("visits", 0) if m else 0
        u["lifetime_visits"] = m.get("lifetime_visits", 0) if m else 0
    return users

# ---------- ACTIVITY LOG ----------
@admin.get("/activity-log", dependencies=[Depends(require_owner)])
async def admin_activity(limit: int = 50):
    items = await db.activity_log.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return items

api.include_router(admin)

# ---------- SEED ----------
async def seed_clancys():
    if await db.restaurant.find_one({"_id": RESTAURANT_ID}):
        return
    faltan = sorted(rol for rol, pw in SEED_PASSWORDS.items() if not pw)
    if faltan:
        raise RuntimeError(
            "No puedo crear las cuentas iniciales: faltan las variables de entorno "
            + ", ".join(f"SEED_{r.upper()}_PASSWORD" for r in faltan)
            + ". Copiá backend/.env.example a backend/.env y completalas."
        )
    await db.restaurant.insert_one({
        "_id": RESTAURANT_ID,
        "name": "Clancy's",
        "tagline": "A taste of Ireland",
        "description": "Heritage Irish dining in the heart of Cork. Family-run kitchen, hand-cut produce, and a snug atmosphere of warm oak and brass.",
        "logo_url": "https://images.unsplash.com/photo-1497644083578-611b798c60f3?w=300&q=80",
        "cover_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
        "interior_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
        "address": "Cork, Ireland",  # TODO(cliente): calle y número exactos
        "phone": "",  # TODO(cliente): teléfono real (Cork es +353 21, no +353 1)
        "hours": "Mon–Thu 17:00–23:00 · Fri–Sat 12:00–24:00 · Sun 12:00–22:00",
        "instagram": "",  # TODO(cliente): handle real de Instagram
        "primary_color": "#0E5C3A",
        "accent_color": "#C9A961",
        "created_at": now_utc(),
    })

    await db.users.insert_one({
        "user_id": "usr_owner_clancy",
        "email": "owner@clancys.ie",
        "name": "Liam Clancy",
        "password_hash": hash_password(SEED_PASSWORDS["owner"]),
        "picture": None, "role": "owner", "active": True,
        "auth_provider": "email", "created_at": now_utc(),
    })
    await db.users.insert_one({
        "user_id": "usr_mgr_001", "email": "manager@clancys.ie", "name": "Aoife Byrne",
        "password_hash": hash_password(SEED_PASSWORDS["manager"]),
        "role": "manager", "active": True, "auth_provider": "email", "created_at": now_utc(),
    })
    await db.users.insert_one({
        "user_id": "usr_wtr_001", "email": "waiter@clancys.ie", "name": "Sean O'Reilly",
        "password_hash": hash_password(SEED_PASSWORDS["waiter"]),
        "role": "waiter", "active": True, "auth_provider": "email", "created_at": now_utc(),
    })

    rewards = [
        ("Complimentary Irish Coffee", "Our signature Jameson Irish coffee, on the house.",
         3, "drink", "Worth €8", 30, None),
        ("Free Dessert of Choice", "Any dessert from our pastry chef's selection.",
         5, "dessert", "Worth €12", 30, None),
        ("Chef's Tasting Plate", "A curated 4-course tasting from Chef Clancy.",
         10, "tasting", "Worth €45", 60, None),
        ("Birthday Champagne", "A glass of Pol Roger to mark your birthday with us.",
         1, "birthday", "Worth €18", 14, None),
        ("Members-only Whiskey Flight", "A 3-glass whiskey flight from our reserve cabinet.",
         15, "exclusive", "Worth €38", 90, None),
    ]
    await db.rewards.insert_many([{
        "reward_id": gen_id("rwd"), "name": n, "description": d,
        "visits_required": vr, "reward_type": rt, "value": val,
        "expires_days": ed, "image_url": img, "active": True, "created_at": now_utc(),
    } for n, d, vr, rt, val, ed, img in rewards])

    promos = [
        ("St. Patrick's Feast", "Traditional Irish stew, soda bread, and live trad music. March 17th only.",
         None, "#0E5C3A"),
        ("Whiskey Pairing Evening", "Five courses paired with rare Irish whiskeys. Every last Friday.",
         None, "#5B3A1E"),
        ("Sunday Roast Tradition", "Slow-roasted Wicklow beef, Yorkshire pudding, garden vegetables.",
         None, "#C9A961"),
    ]
    await db.promotions.insert_many([{
        "promotion_id": gen_id("prm"), "title": t, "description": d,
        "image_url": img, "banner_color": col, "active": True,
        "valid_until": now_utc() + timedelta(days=365), "push_on_publish": False,
        "created_at": now_utc(),
    } for t, d, img, col in promos])

    # Menu — the real one, from data/menu.clancys-cork.json
    await db.menu_items.insert_many(list(menu_seed_docs()))

    logger.info("Clancy's seed completed")

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.memberships.create_index("user_id", unique=True)
    await db.qr_tokens.create_index("token", unique=True)
    await db.qr_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.menu_items.create_index([("category", 1), ("order", 1)])
    await db.rewards.create_index("visits_required")
    await db.activity_log.create_index([("created_at", -1)])
    await seed_clancys()
    logger.info("Clancy's backend up")

@app.on_event("shutdown")
async def shutdown():
    await push_client.aclose(); client.close()

app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(api)
_origenes = CORS_ORIGINS or CORS_FALLBACK
if not CORS_ORIGINS:
    logger.warning("CORS_ORIGINS vacío: permitiendo solo desarrollo local (%s). "
                   "En producción hay que listar el dominio real.", ", ".join(_origenes))
app.add_middleware(CORSMiddleware, allow_origins=_origenes, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
