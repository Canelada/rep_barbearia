import mongoose from 'mongoose';
import Agendamento from '../src/models/Agendamento.js';
import Servico from '../src/models/Servico.js';
import dotenv from 'dotenv';

dotenv.config();

const atualizarComissaoAgendamentos = async () => {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    console.log('🔄 Buscando agendamentos sem comissão...');

    // Buscar agendamentos que não têm comissão ou têm comissão 0
    const agendamentos = await Agendamento.find({
      $or: [
        { comissao: { $exists: false } },
        { comissao: 0 },
        { 'servicos.comissao': { $exists: false } },
        { 'servicos.comissao': 0 }
      ]
    }).populate('servicoId').populate('servicos.servicoId');

    console.log(`📋 Encontrados ${agendamentos.length} agendamentos para atualizar`);

    let atualizados = 0;

    for (const agendamento of agendamentos) {
      let atualizado = false;

      // Atualizar comissão do formato antigo (servicoId único)
      if (agendamento.servicoId && (!agendamento.comissao || agendamento.comissao === 0)) {
        const servico = await Servico.findById(agendamento.servicoId);
        if (servico && servico.comissao) {
          agendamento.comissao = servico.comissao;
          atualizado = true;
          console.log(`  📝 Agendamento ${agendamento._id}: comissão ${servico.comissao}% (formato antigo)`);
        }
      }

      // Atualizar comissão do formato novo (múltiplos serviços)
      if (agendamento.servicos && agendamento.servicos.length > 0) {
        for (let i = 0; i < agendamento.servicos.length; i++) {
          const servicoAgendamento = agendamento.servicos[i];
          if (!servicoAgendamento.comissao || servicoAgendamento.comissao === 0) {
            const servico = await Servico.findById(servicoAgendamento.servicoId);
            if (servico && servico.comissao) {
              agendamento.servicos[i].comissao = servico.comissao;
              atualizado = true;
              console.log(`  📝 Agendamento ${agendamento._id}: serviço ${servico.nome} comissão ${servico.comissao}%`);
            }
          }
        }
      }

      if (atualizado) {
        await agendamento.save({ validateBeforeSave: false });
        atualizados++;
      }
    }

    console.log(`🎉 Processo concluído! ${atualizados} agendamentos atualizados.`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado do MongoDB');
  }
};

atualizarComissaoAgendamentos();