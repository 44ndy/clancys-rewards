"""Preparacion comun de las pruebas.

El backend lee su configuracion y se conecta a Mongo al importarse, asi que la
base de prueba tiene que quedar fijada en el entorno ANTES del import. Se usa
una base descartable: `load_dotenv` no pisa lo que ya esta en el entorno, de
modo que el DB_NAME de aca gana sobre el del .env y las pruebas nunca tocan los
datos reales.

Para crear datos de prueba se usa pymongo (sincrono) y no el cliente de motor
de la app: motor necesita el bucle de asyncio vivo, y en el teardown de pytest
ese bucle ya esta cerrado.
"""
import os
import sys
import uuid
from pathlib import Path

import pytest
from pymongo import MongoClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

# Suite antigua del prototipo, ya obsoleta. No se versiona y no se recoge.
collect_ignore = ["clancys_backend_test.py"]

BASE_PRUEBA = f"clancys_test_{uuid.uuid4().hex[:8]}"
os.environ["DB_NAME"] = BASE_PRUEBA

from fastapi.testclient import TestClient  # noqa: E402
import server  # noqa: E402

# El dominio tiene que ser uno real: email-validator rechaza los de uso
# especial como .local, y el endpoint responderia 422 en vez de 401.
DOMINIO = "example.com"
CLAVE_PRUEBA = "una-clave-larga-de-prueba"


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(os.environ["MONGO_URL"])
    yield c
    c.drop_database(BASE_PRUEBA)
    c.close()


@pytest.fixture(scope="session")
def cliente(mongo):
    """Cliente HTTP contra la app, con el startup real (crea indices y seed)."""
    with TestClient(server.app) as c:
        yield c


@pytest.fixture(autouse=True)
def limpiar_contadores():
    """El limitador guarda su estado en un diccionario del modulo.

    Sin esto, lo que cuenta una prueba se le suma a la siguiente y los
    resultados dependen del orden en que corran.
    """
    server._intentos.clear()
    yield
    server._intentos.clear()


def crear_empleado(mongo, rol="waiter"):
    """Inserta un empleado y devuelve sus datos y un token valido."""
    uid = f"usr_test_{uuid.uuid4().hex[:8]}"
    correo = f"{uid}@{DOMINIO}"
    mongo[BASE_PRUEBA].users.insert_one({
        "user_id": uid,
        "email": correo,
        "name": "Empleado de prueba",
        "password_hash": server.hash_password(CLAVE_PRUEBA),
        "role": rol, "active": True,
        "auth_provider": "email", "created_at": server.now_utc(),
    })
    return {"user_id": uid, "email": correo, "token": server.create_jwt(uid)}


@pytest.fixture
def mesero(cliente, mongo):
    return crear_empleado(mongo)
