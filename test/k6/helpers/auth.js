import http from 'k6/http';
import { check } from 'k6';

/**
 * Função helper para realizar login e retornar o token de autenticação
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {string} Token JWT
 */
export function login(email, password) {
  const url = `${__ENV.BASE_URL}/api/auth/login`;
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json().data && r.json().data.hasOwnProperty('token'),
  });

  return response.json().data.token;
}