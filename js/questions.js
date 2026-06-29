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
      text: "Quando sua empresa precisa tomar decisões importantes, elas são baseadas em dados ou na experiência e intuição?",
      options: [
        opt("Ainda decidimos principalmente pela experiência e intuição.", 0),
        opt("Combinamos experiência com alguns dados, mas ainda sem consistência.", 1),
        opt("As decisões são tomadas com base em indicadores e informações confiáveis.", 2),
      ],
    },
    {
      id: 2,
      organ: ORGANS.cerebro.key,
      text: "O crescimento da sua empresa acontece por planejamento ou pelas oportunidades que surgem?",
      options: [
        opt("Crescemos conforme as oportunidades aparecem.", 0),
        opt("Temos objetivos definidos, mas ainda sem um planejamento estruturado.", 1),
        opt("Seguimos um planejamento claro para crescer de forma sustentável.", 2),
      ],
    },
    {
      id: 3,
      organ: ORGANS.cerebro.key,
      text: "Se você se afastar da empresa por uma semana, ela continuará funcionando com o mesmo nível de desempenho?",
      options: [
        opt("Não. A operação depende diretamente da minha presença.", 0),
        opt("Em parte. Algumas decisões ainda precisam da minha participação.", 1),
        opt("Sim. A empresa funciona com autonomia e mantém os resultados.", 2),
      ],
    },
    {
      id: 4,
      organ: ORGANS.coracao.key,
      text: "Quando surgem problemas na rotina, sua equipe resolve ou tudo acaba chegando até você?",
      options: [
        opt("Quase tudo depende de mim.", 0),
        opt("A equipe resolve algumas situações, mas ainda depende bastante da minha intervenção.", 1),
        opt("A equipe resolve a maior parte dos desafios com autonomia.", 2),
      ],
    },
    {
      id: 5,
      organ: ORGANS.coracao.key,
      text: "Os líderes da sua empresa desenvolvem pessoas ou apenas resolvem os problemas do dia a dia?",
      options: [
        opt("Atuam principalmente apagando incêndios e resolvendo problemas operacionais.", 0),
        opt("Existe algum desenvolvimento da equipe, mas ainda sem consistência.", 1),
        opt("Desenvolvem pessoas, acompanham desempenho e fortalecem continuamente a equipe.", 2),
      ],
    },
    {
      id: 6,
      organ: ORGANS.coracao.key,
      text: "Sua empresa consegue manter uma equipe comprometida e focada em resultados de forma consistente?",
      options: [
        opt("O comprometimento da equipe é baixo e os resultados dependem de cobranças constantes.", 0),
        opt("O comprometimento existe, mas varia entre pessoas ou momentos.", 1),
        opt("A equipe é engajada, comprometida e trabalha com foco nos resultados da empresa.", 2),
      ],
    },
    {
      id: 7,
      organ: ORGANS.pulmao.key,
      text: "Sua empresa sabe exatamente onde ganha dinheiro e onde perde margem?",
      options: [
        opt("Não temos essa clareza.", 0),
        opt("Temos uma percepção, mas sem acompanhamento consistente.", 1),
        opt("Sim. Essas informações orientam nossas decisões comerciais.", 2),
      ],
    },
    {
      id: 8,
      organ: ORGANS.pulmao.key,
      text: "Sua empresa utiliza indicadores comerciais da equipe para tomar decisões, aumentar vendas e proteger a margem e o lucro?",
      options: [
        opt("Não utilizamos indicadores comerciais de forma estruturada.", 0),
        opt("Acompanhamos alguns indicadores, mas eles nem sempre orientam nossas decisões.", 1),
        opt("Os indicadores fazem parte da rotina de gestão e direcionam nossas decisões comerciais.", 2),
      ],
    },
    {
      id: 9,
      organ: ORGANS.pulmao.key,
      text: "Seu estoque contribui para o crescimento da empresa ou frequentemente compromete margem, lucro e fluxo de caixa?",
      options: [
        opt("O estoque frequentemente gera perdas, excesso ou falta de produtos.", 0),
        opt("Temos algum controle, mas ainda ocorrem impactos nos resultados.", 1),
        opt("O estoque é planejado e acompanhado para apoiar as vendas e proteger a lucratividade.", 2),
      ],
    },
    {
      id: 10,
      organ: ORGANS.sangue.key,
      text: "Se um colaborador importante sair hoje, sua empresa continuará funcionando normalmente?",
      options: [
        opt("Não. A operação sofreria um impacto significativo.", 0),
        opt("Haveria alguns impactos, mas conseguiríamos manter parte da operação.", 1),
        opt("Sim. Os processos garantem a continuidade da operação.", 2),
      ],
    },
    {
      id: 11,
      organ: ORGANS.sangue.key,
      text: "O cliente recebe a mesma experiência independentemente do dia, da equipe ou da unidade?",
      options: [
        opt("Não. A experiência varia bastante.", 0),
        opt("Existem padrões, mas ainda ocorrem diferenças na execução.", 1),
        opt("Sim. A experiência é consistente em toda a operação.", 2),
      ],
    },
    {
      id: 12,
      organ: ORGANS.sangue.key,
      text: "Quando a empresa cresce ou aumenta o movimento, a operação continua organizada ou começam os erros e retrabalhos?",
      options: [
        opt("O aumento da demanda gera erros, retrabalho e perda de eficiência.", 0),
        opt("A operação suporta parte do crescimento, mas ainda apresenta falhas.", 1),
        opt("A operação está estruturada para crescer mantendo qualidade e eficiência.", 2),
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
