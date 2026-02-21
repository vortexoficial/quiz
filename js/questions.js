/* Definições de perguntas (passos 2 a 13)
 * - Sem frameworks
 * - Estrutura simples para navegação e persistência
 */

(function () {
  "use strict";

  /**
   * Contagem de passos:
   * - Passo 1: lead
   * - Passos 2..(N+1): perguntas (N=12)
   *
   * Pontuação por alternativa:
   * - Estratégica: 2
   * - Intermediária: 1
   * - Crítica: 0
   */

  const ORGANS = {
    cerebro: { key: "cerebro", label: "Cérebro" },
    coracao: { key: "coracao", label: "Coração" },
    pulmao: { key: "pulmao", label: "Pulmão" },
    sangue: { key: "sangue", label: "Sangue" },
  };

  function opt(text, points) {
    return { text, points };
  }

  const QUESTIONS = [
    {
      id: 1,
      organ: ORGANS.cerebro.key,
      text: "Você tem metas claras de faturamento e margem por loja e por coleção?",
      options: [
        opt("Sim, acompanho metas por loja e desempenho por coleção", 2),
        opt("Tenho metas gerais, mas sem detalhamento por unidade", 1),
        opt("Não trabalho com metas estruturadas", 0),
      ],
    },
    {
      id: 2,
      organ: ORGANS.cerebro.key,
      text: "Existe um plano estruturado de crescimento (novas lojas, mix, canais digitais)?",
      options: [
        opt("Sim, com metas, prazos e indicadores definidos", 2),
        opt("Tenho intenção de crescer, mas sem plano formal", 1),
        opt("Cresço conforme surgem oportunidades", 0),
      ],
    },
    {
      id: 3,
      organ: ORGANS.cerebro.key,
      text: "Suas lojas funcionam bem sem sua presença constante?",
      options: [
        opt("Sim, gestores assumem resultados com autonomia", 2),
        opt("Funcionam parcialmente, ainda dependem de mim", 1),
        opt("Tudo depende diretamente de mim", 0),
      ],
    },
    {
      id: 4,
      organ: ORGANS.coracao.key,
      text: "Cada loja tem metas claras e responsabilidades bem definidas?",
      options: [
        opt("Sim, metas e papéis são claros e acompanhados", 2),
        opt("Parcialmente definidos", 1),
        opt("Há confusão sobre responsabilidades", 0),
      ],
    },
    {
      id: 5,
      organ: ORGANS.coracao.key,
      text: "A cultura da rede é forte o suficiente para sustentar decisões e comportamentos sem depender da direção?",
      options: [
        opt("Sim, existe identidade clara e padrão consolidado", 2),
        opt("Em parte, ainda há variações entre lojas", 1),
        opt("Não, falta alinhamento cultural", 0),
      ],
    },
    {
      id: 6,
      organ: ORGANS.coracao.key,
      text: "Você acompanha indicadores de desempenho da equipe (conversão, ticket médio, metas individuais)?",
      options: [
        opt("Sim, com acompanhamento frequente", 2),
        opt("Às vezes acompanho, sem rotina fixa", 1),
        opt("Não utilizo indicadores claros", 0),
      ],
    },
    {
      id: 7,
      organ: ORGANS.pulmao.key,
      text: "Você sabe o lucro real por loja e por coleção?",
      options: [
        opt("Sim, com controle detalhado", 2),
        opt("Tenho noção geral, mas sem precisão por unidade", 1),
        opt("Não tenho essa clareza", 0),
      ],
    },
    {
      id: 8,
      organ: ORGANS.pulmao.key,
      text: "Seus preços são definidos com base em margem, giro e posicionamento de marca?",
      options: [
        opt("Sim, com estratégia definida", 2),
        opt("Considero mercado e concorrência, mas sem cálculo completo", 1),
        opt("Defino preços principalmente por comparação", 0),
      ],
    },
    {
      id: 9,
      organ: ORGANS.pulmao.key,
      text: "Sua empresa tem previsibilidade financeira e controle de estoque (giro, sobra, ruptura)?",
      options: [
        opt("Sim, com indicadores e controle frequente", 2),
        opt("Parcialmente controlado", 1),
        opt("Não tenho controle estruturado", 0),
      ],
    },
    {
      id: 10,
      organ: ORGANS.sangue.key,
      text: "A experiência do cliente é padronizada em todas as lojas (atendimento, VM, abordagem)?",
      options: [
        opt("Sim, existe padrão claro e treinamento consistente", 2),
        opt("Em parte, varia entre lojas", 1),
        opt("Cada loja atua de forma diferente", 0),
      ],
    },
    {
      id: 11,
      organ: ORGANS.sangue.key,
      text: "Existem processos claros para compras, reposição e controle de estoque?",
      options: [
        opt("Sim, com sistema e acompanhamento regular", 2),
        opt("Parcialmente organizados", 1),
        opt("Não há processo estruturado", 0),
      ],
    },
    {
      id: 12,
      organ: ORGANS.sangue.key,
      text: "Você mede satisfação do cliente e taxa de recompra/fidelização?",
      options: [
        opt("Sim, com acompanhamento constante", 2),
        opt("Às vezes coletamos feedback", 1),
        opt("Não medimos de forma estruturada", 0),
      ],
    },
  ];

  function getQuestionCount() {
    return QUESTIONS.length;
  }

  function getTotalSteps() {
    return getQuestionCount() + 1;
  }

  function getQuestionByStep(step) {
    // step 2 => index 0
    const index = Number(step) - 2;
    if (!Number.isFinite(index) || index < 0 || index >= QUESTIONS.length) return null;
    return QUESTIONS[index];
  }

  function getOrgans() {
    return ORGANS;
  }

  window.GPSQuestions = {
    getTotalSteps,
    getQuestionCount,
    getQuestionByStep,
    getOrgans,
    QUESTIONS,
  };
})();
