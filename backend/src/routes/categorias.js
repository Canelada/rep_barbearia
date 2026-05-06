import express from 'express';
import Servico from '../models/Servico.js';
import Categoria from '../models/Categoria.js';

const router = express.Router();

// GET - Listar todas as categorias (padrão + personalizadas)
router.get('/', async (req, res) => {
  try {
    // Usar método estático do modelo para obter todas as categorias
    const todasCategorias = await Categoria.obterTodasCategorias();

    res.json({
      success: true,
      data: todasCategorias,
      total: todasCategorias.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar categorias',
      error: error.message,
    });
  }
});

// POST - Adicionar nova categoria personalizada
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    
    if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nome da categoria é obrigatório'
      });
    }

    const nomeCategoria = nome.trim();
    
    // Verificar se a categoria já existe (tanto nas padrão quanto nas personalizadas)
    const todasCategorias = await Categoria.obterTodasCategorias();
    const categoriaExiste = todasCategorias.some(cat => 
      cat.toLowerCase() === nomeCategoria.toLowerCase()
    );
    
    if (categoriaExiste) {
      return res.status(400).json({
        success: false,
        message: 'Esta categoria já existe'
      });
    }

    // Validar caracteres especiais
    const caracteresPermitidos = /^[a-zA-Z0-9\s\-+áéíóúâêîôûàèìòùãõçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]+$/;
    if (!caracteresPermitidos.test(nomeCategoria)) {
      return res.status(400).json({
        success: false,
        message: 'Nome da categoria contém caracteres inválidos'
      });
    }

    // Validar tamanho
    if (nomeCategoria.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Nome da categoria deve ter no máximo 50 caracteres'
      });
    }

    // Criar nova categoria personalizada
    const novaCategoria = new Categoria({
      nome: nomeCategoria,
      ativa: true,
      ordem: 100 // Categorias personalizadas vão para o final
    });

    await novaCategoria.save();

    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: { 
        nome: nomeCategoria,
        id: novaCategoria._id
      }
    });
  } catch (error) {
    console.error('❌ Erro ao criar categoria:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Esta categoria já existe'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao criar categoria',
      error: error.message
    });
  }
});

// GET - Estatísticas de uso das categorias
router.get('/estatisticas', async (req, res) => {
  try {
    const estatisticasServicos = await Servico.aggregate([
      {
        $group: {
          _id: '$categoria',
          total: { $sum: 1 },
          ativos: { $sum: { $cond: ['$ativo', 1, 0] } },
          inativos: { $sum: { $cond: ['$ativo', 0, 1] } },
          precoMedio: { $avg: '$preco' },
          duracaoMedia: { $avg: '$duracaoMin' }
        }
      },
      {
        $sort: { total: -1 }
      },
      {
        $project: {
          categoria: '$_id',
          total: 1,
          ativos: 1,
          inativos: 1,
          precoMedio: { $round: ['$precoMedio', 2] },
          duracaoMedia: { $round: ['$duracaoMedia', 0] },
          _id: 0
        }
      }
    ]);

    // Buscar categorias personalizadas
    const categoriasPersonalizadas = await Categoria.find({ ativa: true })
      .select('nome createdAt')
      .lean();

    const estatisticas = {
      servicosPorCategoria: estatisticasServicos,
      categoriasPersonalizadas: categoriasPersonalizadas.length,
      totalCategorias: (await Categoria.obterTodasCategorias()).length
    };
    res.json({
      success: true,
      data: estatisticas
    });
  } catch (error) {
    console.error('❌ Erro ao gerar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar estatísticas',
      error: error.message
    });
  }
});

// DELETE - Excluir categoria personalizada (por ID ou nome)
router.delete('/:identificador', async (req, res) => {
  try {
    const { identificador } = req.params;

    // Tentar encontrar por ID ou nome
    let categoria;

    // Verificar se é um ObjectId válido
    if (identificador.match(/^[0-9a-fA-F]{24}$/)) {
      categoria = await Categoria.findById(identificador);
    }

    // Se não encontrou por ID, tentar por nome
    if (!categoria) {
      categoria = await Categoria.findOne({ nome: decodeURIComponent(identificador) });
    }

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Verificar se a categoria está sendo usada por algum serviço
    const servicosUsandoCategoria = await Servico.countDocuments({
      categoria: categoria.nome
    });

    if (servicosUsandoCategoria > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível excluir. Esta categoria está sendo usada por ${servicosUsandoCategoria} serviço(s)`
      });
    }

    await Categoria.findByIdAndDelete(categoria._id);

    res.json({
      success: true,
      message: 'Categoria excluída com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao excluir categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir categoria',
      error: error.message
    });
  }
});

export default router;
