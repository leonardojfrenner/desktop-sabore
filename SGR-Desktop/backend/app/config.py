import os
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv('config.env')

API_EXTERNA_BASE_URL = os.getenv('API_EXTERNA_URL', 'https://meu-back-restaurante.92x7nhce4t8m6.us-east-1.cs.amazonlightsail.com/')


if API_EXTERNA_BASE_URL:
    API_EXTERNA_BASE_URL = API_EXTERNA_BASE_URL.strip()
    if ' <--' in API_EXTERNA_BASE_URL or ' #' in API_EXTERNA_BASE_URL:
        API_EXTERNA_BASE_URL = API_EXTERNA_BASE_URL.split(' <--')[0].split(' #')[0].strip()
    if not API_EXTERNA_BASE_URL.endswith('/'):
        API_EXTERNA_BASE_URL = f'{API_EXTERNA_BASE_URL}/'

API_TIMEOUT = int(os.getenv('API_TIMEOUT', '30'))

try:
    parsed_url = urlparse(API_EXTERNA_BASE_URL.rstrip('/'))
    API_EXTERNA_PROTOCOL = parsed_url.scheme or 'http'
    API_EXTERNA_HOST = parsed_url.hostname or 'meu-back-restaurante.92x7nhce4t8m6.us-east-1.cs.amazonlightsail.com'
    API_EXTERNA_PORT = parsed_url.port or (443 if API_EXTERNA_PROTOCOL == 'https' else 80)
except Exception:
    API_EXTERNA_PROTOCOL = 'https'
    API_EXTERNA_HOST = 'meu-back-restaurante.92x7nhce4t8m6.us-east-1.cs.amazonlightsail.com'
    API_EXTERNA_PORT = 443

__all__ = [
    'API_EXTERNA_BASE_URL',
    'API_TIMEOUT',
    'API_EXTERNA_PROTOCOL',
    'API_EXTERNA_HOST',
    'API_EXTERNA_PORT',
]

