/**
 * Middleware de Paginação
 * 
 * Processa e valida parâmetros de paginação da query string
 * Adiciona propriedade req.pagination com: page, limit, skip
 * 
 * Uso: router.get('/', pagination, asyncHandler(handler))
 */

const pagination = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  req.pagination = { page, limit, skip };
  next();
};

export default pagination;
