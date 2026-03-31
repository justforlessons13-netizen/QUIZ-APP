import { Question, Team } from '@/types/game';

export const sampleQuestions: Question[] = [
  {
    id: 1, round: 1, category: "🌍 Geography",
    text: "What is the capital of Australia?",
    answer: "Canberra", type: 'text',
  },
  {
    id: 2, round: 2, category: "📜 History",
    text: "In what year did the Titanic sink?",
    answer: "1912", type: 'text',
  },
  {
    id: 3, round: 3, category: "🔬 Science",
    text: "What element has the chemical symbol 'Au'?",
    answer: "Gold", type: 'text',
  },
  {
    id: 4, round: 4, category: "🎨 Art",
    text: "Who painted the Mona Lisa?",
    answer: "Leonardo da Vinci", type: 'text',
  },
  {
    id: 5, round: 5, category: "🌿 Nature",
    text: "What is the longest river in the world?",
    answer: "Nile", type: 'text',
  },
  {
    id: 6, round: 6, category: "🎬 Movies",
    text: "Which movie won the Academy Award for Best Picture in 1994?",
    answer: "Forrest Gump", type: 'mcq',
    options: ["Pulp Fiction", "Forrest Gump", "The Shawshank Redemption", "The Lion King"],
  },
];

export const initialTeams: Team[] = [
  { id: 'player', name: 'Your Team', emoji: '🎯', score: 0, roundScores: [], isPlayer: true },
  { id: 'team_b', name: 'Brain Busters', emoji: '🧠', score: 0, roundScores: [], isPlayer: false },
  { id: 'team_c', name: 'Quiz Wizards', emoji: '🧙', score: 0, roundScores: [], isPlayer: false },
  { id: 'team_d', name: 'Unity Units', emoji: '🤝', score: 0, roundScores: [], isPlayer: false },
  { id: 'team_e', name: 'The Know-It-Alls', emoji: '📚', score: 0, roundScores: [], isPlayer: false },
];
