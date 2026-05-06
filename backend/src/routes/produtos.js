/**
 * Produtos Routes
 * CRUD de produtos/estoque da barbearia.
 *
 * Endpoints:
 * - GET /api/produtos - Lista produtos
 * - GET /api/produtos/estatisticas/estoque - Estatísticas do estoque
 * - GET /api/produtos/alerta-reposicao - Produtos para reposição
 * - GET /api/produtos/:id - Busca produto por ID
 * - POST /api/produtos - Cria produto (Admin)
 * - PUT /api/produtos/:id - Atualiza produto (Admin)
 * - PATCH /api/produtos/:id/movimentar - Movimenta estoque
 * - DELETE /api/produtos/:id - Desativa produto (Admin)
 */
import express from 'express';
import Produto from '../models/Produto.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { handleValidationErrors, asyncHandler } from '../middleware/validation.js';
import pagination from '../middleware/pagination.js';
import { validateProdutoCreate, validateProdutoMovimentacao, validateId } from '../utils/validators.js';
import { registrarLog, extrairInfoRequest } from '../utils/auditLogger.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  pagination,
  asyncHandler(async (req, res) => {
    const { categoria, ativo, emFalta } = req.query;
    const { page, limit, skip } = req.pagination;
    const filtros = {};
    if (categoria) filtros.categoria = categoria;
    if (ativo !== undefined) filtros.ativo = ativo === 'true';

    const [produtos, total] = await Promise.all([
      Produto.find(filtros).sort({ nome: 1 }).skip(skip).limit(limit),
      Produto.countDocuments(filtros),
    ]);

    let produtosFiltrados = produtos;
    if (emFalta === 'true') {
      produtosFiltrados = produtosFiltrados.filter(
        (produto) => produto.emFalta,
      );
    }

    res.json({
      success: true,
      message: 'Produtos listados com sucesso',
      data: produtosFiltrados,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

router.get('/estatisticas/estoque',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const produtos = await Produto.find({ ativo: true });

    const estatisticas = {
      totalProdutos: produtos.length,
      produtosEmFalta: produtos.filter(p => p.emFalta).length,
      produtosZerados: produtos.filter(p => p.quantidade === 0).length,
      produtosBaixoEstoque: produtos.filter(p => p.statusEstoque === 'baixo').length,
      valorTotalEstoque: produtos.reduce((total, p) => total + (p.quantidade * (p.preco || 0)), 0),
      categorias: [...new Set(produtos.map(p => p.categoria))],
      distribuicaoPorCategoria: {}
    };

    produtos.forEach(produto => {
      const categoria = produto.categoria;
      if (!estatisticas.distribuicaoPorCategoria[categoria]) {
        estatisticas.distribuicaoPorCategoria[categoria] = { quantidade: 0, valor: 0, produtos: 0 };
      }
      estatisticas.distribuicaoPorCategoria[categoria].quantidade += produto.quantidade;
      estatisticas.distribuicaoPorCategoria[categoria].valor += produto.quantidade * (produto.preco || 0);
      estatisticas.distribuicaoPorCategoria[categoria].produtos += 1;
    });

    res.json({ success: true, message: 'Estatísticas do estoque', data: estatisticas });
  })
);

router.get('/alerta-reposicao',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const produtos = await Produto.find({ ativo: true });
    const produtosParaReposicao = produtos.filter(produto => produto.precisaReposicao());
    res.json({ success: true, message: 'Produtos para reposição', data: produtosParaReposicao });
  })
);

router.get('/:id',
  authenticateToken,
  validateId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }
    res.json({ success: true, message: 'Produto encontrado', data: produto });
  })
);

router.post('/',
  authenticateToken,
  authorizeRoles('admin'),
  validateProdutoCreate,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const produto = new Produto(req.body);
    await produto.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'criar',
      entidade: 'produto',
      entidadeId: produto._id,
      entidadeNome: produto.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: produto.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Produto "${produto.nome}" criado - ${produto.categoria}`,
    });

    res.status(201).json({ success: true, message: 'Produto criado com sucesso', data: produto });
  })
);

router.put('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const dadosAnteriores = produto.toObject();
    const camposPermitidos = ['nome', 'categoria', 'quantidadeMinima', 'unidade', 'preco', 'fornecedor', 'codigoBarras', 'ativo'];
    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) produto[campo] = req.body[campo];
    });

    await produto.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'atualizar',
      entidade: 'produto',
      entidadeId: produto._id,
      entidadeNome: produto.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      dadosNovos: produto.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Produto "${produto.nome}" atualizado`,
    });

    res.json({ success: true, message: 'Produto atualizado com sucesso', data: produto });
  })
);

router.patch('/:id/movimentar',
  authenticateToken,
  validateId,
  validateProdutoMovimentacao,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { tipo, quantidade, motivo } = req.body;
    const produto = await Produto.findById(req.params.id);

    if (!produto) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const dadosAnteriores = produto.toObject();

    try {
      await produto.movimentar(tipo, quantidade, motivo, req.user._id);

      const infoReq = extrairInfoRequest(req);
      await registrarLog({
        acao: 'movimentar',
        entidade: 'produto',
        entidadeId: produto._id,
        entidadeNome: produto.nome,
        usuarioId: infoReq.usuarioId,
        usuarioNome: infoReq.usuarioNome,
        dadosAnteriores,
        dadosNovos: produto.toObject(),
        ip: infoReq.ip,
        userAgent: infoReq.userAgent,
        detalhes: `Movimentação "${tipo}" de ${quantidade} unidade(s) - ${motivo || 'Sem motivo'}`,
      });

      res.json({ success: true, message: 'Movimentação realizada com sucesso', data: produto });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  })
);

router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const dadosAnteriores = produto.toObject();
    produto.ativo = false;
    await produto.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'excluir',
      entidade: 'produto',
      entidadeId: produto._id,
      entidadeNome: produto.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      dadosNovos: produto.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Produto "${produto.nome}" desativado`,
    });

    res.json({ success: true, message: 'Produto desativado com sucesso', data: produto });
  })
);

export default router;
