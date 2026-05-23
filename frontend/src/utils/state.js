/**
 * Simple reactive global state store
 */
export const state = {
  user: null, // { id, type, role, email, realName, tier, totalSpent }
  currentRoute: '#/login',
  listeners: {},

  init() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        this.logout();
      }
    } else {
      this.logout();
    }
  },

  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    this.emit('user');
  },

  setRoute(route) {
    this.currentRoute = route;
    window.location.hash = route;
    this.emit('route');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.user = null;
    this.emit('user');
    this.setRoute('#/login');
  },

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  emit(event) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(this.user));
    }
  }
};
