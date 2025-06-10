// Middleware para autorización basada en roles y dueño de recurso
module.exports = function authorizeRole(roles = []) {
  // roles puede ser un string o un array de strings
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    // Si es admin, siempre puede
    if (req.user.role === 'admin') {
      return next();
    }
    // Si el rol está permitido y es sobre su propio recurso
    if (
      roles.includes(req.user.role) &&
      req.user._id.toString() === req.params.id
    ) {
      return next();
    }
    return res.status(403).json({ message: 'No autorizado' });
  };
};
