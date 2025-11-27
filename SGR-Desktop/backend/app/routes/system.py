import json
import os
import uuid
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

from ..config import API_EXTERNA_BASE_URL, API_EXTERNA_HOST, API_EXTERNA_PORT, API_TIMEOUT
from ..proxy import api_session, proxy_request, set_session_cookie

system_bp = Blueprint('system', __name__)

# Configuração para upload de imagens
UPLOAD_FOLDER = Path(__file__).parent.parent.parent / 'uploads' / 'imagens'
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def allowed_file(filename):
    """Verifica se o arquivo tem extensão permitida."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@system_bp.route('/api/health', methods=['GET'])
def health_check():
    """Verifica saúde da API Flask (proxy)."""
    try:
        status_code, _ = proxy_request('GET', '')
        api_externa_status = 'active' if status_code == 200 else 'inactive'

        return jsonify({
            'status': 'success',
            'message': 'API Flask (Proxy) está funcionando!',
            'api_externa_status': api_externa_status,
            'api_externa_url': API_EXTERNA_BASE_URL,
            'timestamp': datetime.now().isoformat(),
        })
    except Exception as exc:
        return jsonify({'status': 'error', 'message': str(exc)}), 500


@system_bp.route('/api/restaurantes/perfil', methods=['GET'])
def restaurante_perfil():
    """Busca informações do restaurante logado - Proxy para API externa."""
    try:
        status_code, response_data = proxy_request('GET', 'restaurantes/perfil')

        if status_code == 200 and isinstance(response_data, dict):
            if 'data' not in response_data:
                response_data['data'] = {}

            restaurante_id = None
            restaurante_nome = None

            if 'restaurante_id' in response_data.get('data', {}):
                restaurante_id = response_data['data']['restaurante_id']
            elif 'id' in response_data.get('data', {}):
                restaurante_id = response_data['data']['id']
            elif 'restaurante_id' in response_data:
                restaurante_id = response_data['restaurante_id']
            elif 'id' in response_data:
                restaurante_id = response_data['id']

            if 'restaurante_nome' in response_data.get('data', {}):
                restaurante_nome = response_data['data']['restaurante_nome']
            elif 'nome' in response_data.get('data', {}):
                restaurante_nome = response_data['data']['nome']
            elif 'restaurante_nome' in response_data:
                restaurante_nome = response_data['restaurante_nome']
            elif 'nome' in response_data:
                restaurante_nome = response_data['nome']

            if restaurante_id:
                response_data['data']['restaurante_id'] = restaurante_id
            if restaurante_nome:
                response_data['data']['restaurante_nome'] = restaurante_nome
            
            # Garantir que a imagem também seja incluída se estiver na resposta
            if isinstance(response_data, dict):
                # Tentar extrair imagem de diferentes formatos
                imagem_url = None
                if 'data' in response_data:
                    imagem_url = (response_data['data'].get('imagemUrl') or 
                                 response_data['data'].get('imagem_url') or 
                                 response_data['data'].get('logoUrl') or 
                                 response_data['data'].get('logo_url') or
                                 response_data['data'].get('fotoUrl') or
                                 response_data['data'].get('foto_url'))
                elif 'imagemUrl' in response_data:
                    imagem_url = response_data.get('imagemUrl')
                elif 'imagem_url' in response_data:
                    imagem_url = response_data.get('imagem_url')
                elif 'logoUrl' in response_data:
                    imagem_url = response_data.get('logoUrl')
                elif 'logo_url' in response_data:
                    imagem_url = response_data.get('logo_url')
                
                if imagem_url and 'data' in response_data:
                    response_data['data']['imagemUrl'] = imagem_url

            return jsonify(response_data), status_code

        return jsonify({'status': 'error', 'message': 'Não foi possível obter informações do restaurante'}), status_code

    except Exception as exc:
        print(f"[ERRO] Erro ao buscar perfil: {exc}")
        import traceback

        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error', 'message': str(exc)}), 500


@system_bp.route('/api/restaurantes/<int:restaurante_id>', methods=['GET'])
def get_restaurante_detalhes(restaurante_id):
    """Busca detalhes completos de um restaurante (incluindo avaliações) - Proxy."""
    try:
        print(f"[PROXY] Buscando detalhes completos (com avaliações) para ID: {restaurante_id}")

        status_code, response_data = proxy_request('GET', f'restaurantes/{restaurante_id}')

        return jsonify(response_data), status_code
    except Exception as exc:
        print(f"[ERRO] Erro ao buscar detalhes do restaurante: {exc}")
        import traceback

        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error', 'message': str(exc)}), 500


@system_bp.route('/api/restaurantes/login', methods=['POST'])
def restaurante_login():
    """Login de restaurante - Proxy para API externa (/restaurantes/login)."""
    try:
        data = request.get_json()

        if not data or not data.get('email') or not data.get('senha'):
            return jsonify({'status': 'error', 'message': 'Email e senha são obrigatórios'}), 400

        status_code, response_data = proxy_request('POST', 'restaurantes/login', data=data)

        if status_code == 502 and isinstance(response_data, dict) and response_data.get('diagnostico', {}).get('tipo_erro') == 'url_parse_error':
            return jsonify({
                'status': 'error',
                'message': 'URL inválida no config.env. Remova comentários inline da linha API_EXTERNA_URL.',
                'diagnostico': response_data.get('diagnostico', {}),
            }), 502

        if status_code == 504:
            error_msg = f'Servidor não respondeu em {API_TIMEOUT} segundos. Verifique se o servidor está rodando em {API_EXTERNA_HOST}:{API_EXTERNA_PORT}'
            return jsonify({'status': 'error', 'message': error_msg}), 504

        if status_code == 503:
            error_msg = f'Não foi possível conectar ao servidor em {API_EXTERNA_HOST}:{API_EXTERNA_PORT}. Verifique se o servidor está rodando.'
            return jsonify({'status': 'error', 'message': error_msg}), 503

        if status_code in [401, 403]:
            if isinstance(response_data, dict) and response_data.get('message'):
                error_msg = response_data['message']
            else:
                if API_EXTERNA_HOST in ['localhost', '127.0.0.1']:
                    error_msg = 'Erro de autenticação. Verifique suas credenciais ou se o formato da requisição está correto.'
                else:
                    error_msg = 'Acesso negado. Verifique suas credenciais ou se o servidor está acessível.'

            return jsonify({'status': 'error', 'message': error_msg}), status_code

        if status_code == 200 and isinstance(response_data, dict) and response_data.get('status') == 'success':
            if 'data' not in response_data:
                response_data['data'] = {}

            restaurante_id = response_data.get('data', {}).get('restaurante_id')

            if len(api_session.cookies) > 0:
                cookie_names = list(api_session.cookies.keys())
                print(f"[LOGIN] Cookie(s) na sessao: {', '.join(cookie_names)}")

                if restaurante_id:
                    jsessionid = api_session.cookies.get('JSESSIONID')
                    if jsessionid:
                        cookie_string = f"JSESSIONID={jsessionid}"
                        set_session_cookie(cookie_string, restaurante_id)
                        print(f"[LOGIN] Login bem-sucedido - Cookie JSESSIONID associado ao restaurante_id {restaurante_id}")
                    else:
                        for cookie_name in cookie_names:
                            cookie_val = api_session.cookies.get(cookie_name)
                            if cookie_val:
                                cookie_string = f"{cookie_name}={cookie_val}"
                                set_session_cookie(cookie_string, restaurante_id)
                                print(f"[LOGIN] Login bem-sucedido - Cookie {cookie_name} associado ao restaurante_id {restaurante_id}")
                                break
                else:
                    print("[AVISO] Login bem-sucedido mas restaurante_id nao encontrado na resposta")
                    print("[AVISO] Cookie salvo mas sem associacao ao restaurante_id")
            else:
                print("[AVISO] Login bem-sucedido mas nenhum cookie foi recebido da API externa")

        return jsonify(response_data), status_code

    except Exception as exc:
        print(f"[ERRO] Erro no login: {exc}")
        import traceback

        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error', 'message': str(exc)}), 500


@system_bp.route('/api/upload/imagem', methods=['POST'])
def upload_imagem():
    """Rota para fazer upload de imagem - Proxy para API Java /itens/upload."""
    try:
        # Verificar se há arquivo no request
        if 'imagem' not in request.files and 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'Nenhum arquivo enviado'}), 400
        
        # Aceitar tanto 'imagem' quanto 'file' (compatibilidade)
        arquivo = request.files.get('imagem') or request.files.get('file')
        
        if not arquivo or arquivo.filename == '':
            return jsonify({'status': 'error', 'message': 'Nenhum arquivo selecionado'}), 400
        
        # Validar tipo de arquivo
        if not allowed_file(arquivo.filename):
            return jsonify({
                'status': 'error',
                'message': f'Formato de arquivo não permitido. Use: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Verificar tamanho do arquivo
        arquivo.seek(0, os.SEEK_END)
        tamanho = arquivo.tell()
        arquivo.seek(0)
        
        if tamanho > MAX_FILE_SIZE:
            return jsonify({
                'status': 'error',
                'message': f'Arquivo muito grande. Tamanho máximo: {MAX_FILE_SIZE / (1024*1024):.1f}MB'
            }), 400
        
        print(f"[UPLOAD] Fazendo proxy de upload para API Java: {arquivo.filename} ({tamanho} bytes)")
        
        # Fazer proxy para a API Java
        url_api = f"{API_EXTERNA_BASE_URL}itens/upload"
        
        # Resetar posição do arquivo após verificação de tamanho
        arquivo.seek(0)
        
        # Ler conteúdo do arquivo para enviar
        arquivo_content = arquivo.read()
        arquivo.seek(0)  # Resetar novamente
        
        # Preparar headers (não incluir Content-Type, requests vai definir automaticamente para multipart)
        headers = {
            'User-Agent': 'SGR-Desktop-Flask-Proxy/1.0',
            'Origin': 'http://localhost:5000',
        }
        
        # Adicionar cookies da sessão
        if len(api_session.cookies) > 0:
            cookie_header = '; '.join([f"{name}={value}" for name, value in api_session.cookies.items()])
            headers['Cookie'] = cookie_header
        
        # Preparar arquivo para multipart/form-data
        # API Java espera 'file' como nome do campo
        files = {'file': (arquivo.filename, arquivo_content, arquivo.content_type)}
        
        # Fazer requisição para API Java
        response = api_session.post(
            url_api,
            files=files,
            headers=headers,
            timeout=API_TIMEOUT
        )
        
        print(f"[UPLOAD] Resposta da API Java: Status {response.status_code}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                url_imagem = response_data.get('url', '')
                
                print(f"[UPLOAD] Upload bem-sucedido. URL: {url_imagem}")
                
                return jsonify({
                    'status': 'success',
                    'message': 'Imagem enviada com sucesso',
                    'url': url_imagem
                }), 200
            except Exception as e:
                print(f"[UPLOAD] Erro ao parsear resposta JSON: {e}")
                return jsonify({
                    'status': 'error',
                    'message': 'Erro ao processar resposta do servidor'
                }), 500
        else:
            error_msg = f'Erro no upload: Status {response.status_code}'
            try:
                error_data = response.json()
                error_msg = error_data.get('message', error_msg)
            except Exception:
                error_msg = response.text[:200] if response.text else error_msg
            
            print(f"[UPLOAD] Erro: {error_msg}")
            return jsonify({
                'status': 'error',
                'message': error_msg
            }), response.status_code
        
    except Exception as exc:
        print(f"[ERRO] Erro ao fazer upload: {exc}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error', 'message': f'Erro ao fazer upload: {str(exc)}'}), 500

