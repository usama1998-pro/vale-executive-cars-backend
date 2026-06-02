import { ADMIN_TOKEN_COOKIE } from './swagger-admin.middleware';

/** Injected into Swagger UI — reuses admin portal session (cookie / sessionStorage). */
export function buildSwaggerAdminAuthScript(): string {
  return `
(function () {
  var COOKIE = '${ADMIN_TOKEN_COOKIE}';
  var SCHEME = 'access-token';

  function readCookie(name) {
    var match = document.cookie.match(
      new RegExp('(?:^|;\\\\s*)' + name + '=([^;]*)'),
    );
    return match ? decodeURIComponent(match[1]) : '';
  }

  function getToken() {
    return (
      readCookie(COOKIE) ||
      (typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(COOKIE)) ||
      ''
    );
  }

  function authorizeUi() {
    var token = getToken();
    if (!token || !window.ui) {
      return false;
    }
    try {
      window.ui.preauthorizeApiKey(SCHEME, token);
      if (window.ui.authActions && window.ui.authActions.authorize) {
        window.ui.authActions.authorize({
          'access-token': {
            name: SCHEME,
            schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            value: token,
          },
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  var attempts = 0;
  var timer = setInterval(function () {
    if (authorizeUi() || ++attempts > 200) {
      clearInterval(timer);
    }
  }, 25);
})();
`.trim();
}
