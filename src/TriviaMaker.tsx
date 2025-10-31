import { useState, useEffect } from 'react'
import { Home, HelpCircle } from 'lucide-react'

interface AmiiboForTrivia {
  amiiboSeries: string
  character: string
  gameSeries: string
  head: string
  image: string
  name: string
  tail: string
  type: string
  release?: {
    na: string
    eu: string
    jp: string
    au: string
  }
}

interface Question {
  amiibo: AmiiboForTrivia
  type: 'name' | 'series' | 'year'
  correctAnswer: string
  options: string[]
}

const TriviaMaker = ({ amiibos, onBack }: { amiibos: AmiiboForTrivia[], onBack: () => void }) => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)

  useEffect(() => {
    generateQuestions()
  }, [])

  const generateQuestions = () => {
    const shuffledAmiibos = [...amiibos].sort(() => Math.random() - 0.5)
    const questionTypes: ('name' | 'series' | 'year')[] = ['name', 'series', 'year']
    const newQuestions: Question[] = []

    for (let i = 0; i < 10; i++) {
      const amiibo = shuffledAmiibos[i]
      const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)]
      let correctAnswer: string
      let options: string[] = []

      switch (questionType) {
        case 'name':
          correctAnswer = amiibo.name
          options = getRandomAmiiboNames(shuffledAmiibos, amiibo.name)
          break
        case 'series':
          correctAnswer = amiibo.amiiboSeries
          options = getRandomAmiiboSeries(shuffledAmiibos, amiibo.amiiboSeries)
          break
        case 'year':
          const releaseYear = amiibo.release?.na?.split('-')[0] || '2014'
          correctAnswer = releaseYear
          options = getRandomYears(parseInt(releaseYear))
          break
      }

      newQuestions.push({
        amiibo,
        type: questionType,
        correctAnswer,
        options: shuffleArray([...options, correctAnswer])
      })
    }

    setQuestions(newQuestions)
  }

  const getRandomAmiiboNames = (amiibos: AmiiboForTrivia[], excludeName: string): string[] => {
    return amiibos
      .filter(a => a.name !== excludeName)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(a => a.name)
  }

  const getRandomAmiiboSeries = (amiibos: AmiiboForTrivia[], excludeSeries: string): string[] => {
    const uniqueSeries = [...new Set(amiibos.map(a => a.amiiboSeries))]
    return uniqueSeries
      .filter(s => s !== excludeSeries)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
  }

  const getRandomYears = (correctYear: number): string[] => {
    const years: string[] = []
    while (years.length < 3) {
      const year = 2014 + Math.floor(Math.random() * (2025 - 2014))
      if (year !== correctYear && !years.includes(year.toString())) {
        years.push(year.toString())
      }
    }
    return years
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5)
  }

  const handleAnswer = (answer: string) => {
    if (isAnswered) return

    setSelectedAnswer(answer)
    setIsAnswered(true)

    if (answer === questions[currentQuestion].correctAnswer) {
      setScore(score + 10)
    }

    setTimeout(() => {
      if (currentQuestion === 9) {
        setGameOver(true)
      } else {
        setCurrentQuestion(currentQuestion + 1)
        setSelectedAnswer(null)
        setIsAnswered(false)
      }
    }, 1500)
  }

  const restartGame = () => {
    setCurrentQuestion(0)
    setScore(0)
    setGameOver(false)
    setSelectedAnswer(null)
    setIsAnswered(false)
    generateQuestions()
  }

  if (questions.length === 0) {
    return <div className="text-center py-8">Loading trivia...</div>
  }

  const currentQ = questions[currentQuestion]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Home size={18} />
            Back to Collection
          </button>
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold">Score: {score}/100</span>
            <span className="text-lg font-semibold">Question: {currentQuestion + 1}/10</span>
          </div>
        </div>

        {gameOver ? (
          <div className="text-center py-16">
            <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
            <p className="text-2xl mb-8">Final Score: {score}/100</p>
            <button
              onClick={restartGame}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Play Again
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="aspect-square mb-6">
                <img
                  src={currentQ.amiibo.image}
                  alt="Mystery Amiibo"
                  className="w-full h-full object-contain"
                />
              </div>
              
              <h2 className="text-xl font-semibold mb-4">
                What is the {currentQ.type === 'year' ? 'release year' : currentQ.type} of this amiibo?
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {currentQ.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                    className={`p-4 rounded-lg text-left font-medium transition-colors ${
                      isAnswered
                        ? option === currentQ.correctAnswer
                          ? 'bg-green-500 text-white'
                          : option === selectedAnswer
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
              <HelpCircle size={24} className="text-blue-500 flex-shrink-0 mt-1" />
              <p className="text-blue-800 text-sm">
                Click on the option you think is correct. You'll get 10 points for each correct answer.
                The game consists of 10 questions about amiibo names, series, and release years.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TriviaMaker
