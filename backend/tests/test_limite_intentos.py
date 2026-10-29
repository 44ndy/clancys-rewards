"""Pruebas del limite de intentos en login y en el escaneo de QR (issue #42).

Dos niveles:
  - La funcion del limitador sola, sin red ni base: rapida y precisa.
  - Los endpoints de verdad, para comprobar que devuelven 429 y Retry-After.
"""
import server
from conftest import CLAVE_PRUEBA, DOMINIO, crear_empleado


# ---------------------------------------------------------------- el limitador

def test_deja_pasar_mientras_no_se_llega_al_limite():
    for _ in range(4):
        assert server._rate_espera("k", 5, 900) is None
        server._rate_anotar("k", 900)
    assert server._rate_espera("k", 5, 900) is None


def test_frena_al_llegar_al_limite():
    for _ in range(5):
        server._rate_anotar("k", 900)
    espera = server._rate_espera("k", 5, 900)
    assert espera is not None
    assert 0 < espera <= 901


def test_las_marcas_viejas_no_cuentan():
    # Una ventana de 0 segundos deja todas las marcas fuera de plazo.
    for _ in range(10):
        server._rate_anotar("k", 900)
    assert server._rate_espera("k", 5, 0) is None


def test_limpiar_borra_la_cuenta():
    for _ in range(5):
        server._rate_anotar("k", 900)
    assert server._rate_espera("k", 5, 900) is not None
    server._rate_limpiar("k")
    assert server._rate_espera("k", 5, 900) is None


def test_cada_clave_cuenta_por_separado():
    for _ in range(5):
        server._rate_anotar("a", 900)
    assert server._rate_espera("a", 5, 900) is not None
    assert server._rate_espera("b", 5, 900) is None


# --------------------------------------------------------------------- login

def _login(cliente, correo, clave):
    return cliente.post("/api/auth/login", json={"email": correo, "password": clave})


def test_login_corta_con_429_despues_de_cinco_fallos(cliente):
    correo = f"nadie@{DOMINIO}"
    for i in range(server.LOGIN_MAX_INTENTOS):
        assert _login(cliente, correo, "mal").status_code == 401, f"intento {i + 1}"

    r = _login(cliente, correo, "mal")
    assert r.status_code == 429
    assert "Retry-After" in r.headers
    assert int(r.headers["Retry-After"]) > 0


def test_el_limite_es_por_correo(cliente):
    for _ in range(server.LOGIN_MAX_INTENTOS + 1):
        _login(cliente, f"uno@{DOMINIO}", "mal")
    # Bloquear un correo no puede dejar afuera a otra persona.
    assert _login(cliente, f"otro@{DOMINIO}", "mal").status_code == 401


def test_entrar_bien_borra_los_fallos(cliente, mesero):
    correo = mesero["email"]
    for _ in range(server.LOGIN_MAX_INTENTOS - 1):
        assert _login(cliente, correo, "mal").status_code == 401

    assert _login(cliente, correo, CLAVE_PRUEBA).status_code == 200

    # Con el contador limpio vuelve a haber margen completo.
    for _ in range(server.LOGIN_MAX_INTENTOS):
        assert _login(cliente, correo, "mal").status_code == 401
    assert _login(cliente, correo, "mal").status_code == 429


# ---------------------------------------------------------------------- scan

def test_escaneo_corta_con_429_y_no_depende_del_token(cliente, mesero):
    cab = {"Authorization": f"Bearer {mesero['token']}"}

    for i in range(server.SCAN_MAX_LLAMADAS):
        r = cliente.post("/api/qr/scan", json={"token": "no-existe"}, headers=cab)
        # 400 porque el QR es falso; lo que importa es que todavia lo atiende.
        assert r.status_code == 400, f"llamada {i + 1} devolvio {r.status_code}"

    r = cliente.post("/api/qr/scan", json={"token": "no-existe"}, headers=cab)
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) > 0


def test_el_limite_de_escaneo_es_por_empleado(cliente, mongo, mesero):
    cab = {"Authorization": f"Bearer {mesero['token']}"}
    for _ in range(server.SCAN_MAX_LLAMADAS + 1):
        cliente.post("/api/qr/scan", json={"token": "no-existe"}, headers=cab)

    # Otro empleado arranca con su propia cuenta en cero.
    otro = crear_empleado(mongo)
    r = cliente.post("/api/qr/scan", json={"token": "no-existe"},
                     headers={"Authorization": f"Bearer {otro['token']}"})
    assert r.status_code == 400
