import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft, Users, Clock, Trophy, RotateCcw } from "lucide-react";
import { Footer } from "@/components/footer";

export default function AmericanFormatRules() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">🥎 American Format Padel Tournament Rules</h1>
          <p className="text-lg text-muted-foreground">
            A comprehensive guide to organizing and playing American Format padel tournaments
          </p>
        </div>

        {/* What is American Format */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              What is an American Format Tournament in Padel?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">
              An American Format Padel Tournament is a fun, social, and competitive way to play padel where players rotate partners and compete against different pairs. Each match awards points to the pair, and at the end of the tournament, each player's points are summed up to determine their overall standing.
            </p>
          </CardContent>
        </Card>

        {/* 8-Player Format */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              8-Player American Format Tournament
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <Badge variant="secondary" className="text-sm">✅ Number of Players: 8</Badge>
              <Badge variant="secondary" className="text-sm">✅ Number of Courts: 2</Badge>
            </div>
            
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Players rotate partners and opponents each round so that everyone partners with every other player at least once.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Each match uses the organizer's selected total: 16, 24, or 32 rally points.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                After each match, players record the points won by their pair.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                At the end of the tournament, each player's individual total score is the sum of all the points they've won as part of each pair.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                The player with the highest individual score is declared the tournament winner.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 12-Player Format */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              12-Player American Format Tournament
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <Badge variant="secondary" className="text-sm">✅ Number of Players: 12</Badge>
              <Badge variant="secondary" className="text-sm">✅ Number of Courts: 3</Badge>
            </div>
            
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Same format as above, but with 3 courts playing simultaneously.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Each player partners with everyone at least once.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Matches use the selected 16, 24, or 32-point total.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Each player's total points are tallied at the end.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Points Counting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              🎾 How Points are Counted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Each match consists of 16, 24, or 32 points. New tournaments default to 24.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Each player serves 4 points (4 rallies) in rotation.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Points are awarded to the pair that wins each rally.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                At the end of the match, each player on the winning pair is credited with the total number of points won by their team.
              </li>
            </ul>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Example:</h4>
              <p className="text-sm text-muted-foreground">
                In a 24-point match, a 15–9 result gives each Team A player 15 points and each Team B player 9 points.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Side Switching */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              🔄 How to Switch Sides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                To keep play fair and balanced, players switch sides halfway through: after 8, 12, or 16 points.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                This rotation helps balance factors like sun glare, wind, or court surface conditions.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                When the halfway point is completed, all players rotate sides clockwise.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                The serve order continues as normal after switching sides.
              </li>
            </ul>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Example Sequence:</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>1️⃣ Player A serves 4 points</div>
                <div>2️⃣ Player B serves 4 points</div>
                <div>➡️ In a 24-point match, switch sides after point 12</div>
                <div>3️⃣ Player C serves 4 points</div>
                <div>4️⃣ Player D serves 4 points</div>
                <div className="mt-2 text-foreground">Continue four-rally serve blocks until the selected match total is reached, then rotate partners and opponents.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📝 Quick Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">✅ 8 Players</Badge>
                  <span className="text-sm text-muted-foreground">2 courts, rotate partners and opponents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">✅ 12 Players</Badge>
                  <span className="text-sm text-muted-foreground">3 courts, same format</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">✅ Scoring</Badge>
                  <span className="text-sm text-muted-foreground">1 point per rally won by the pair</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">✅ Serving</Badge>
                  <span className="text-sm text-muted-foreground">Each player serves 4 rallies per match</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">✅ Switch Sides</Badge>
                  <span className="text-sm text-muted-foreground">Halfway through the selected total</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">✅ Winner</Badge>
                  <span className="text-sm text-muted-foreground">Most cumulative points wins</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Choose American Format */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Why Choose American Format?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">🔝</div>
                <h4 className="font-semibold mb-1">Everyone plays together</h4>
                <p className="text-sm text-muted-foreground">No one sits out</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⚖️</div>
                <h4 className="font-semibold mb-1">Fair scoring</h4>
                <p className="text-sm text-muted-foreground">Points reflect both team and individual contributions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⏱️</div>
                <h4 className="font-semibold mb-1">Flexible timing</h4>
                <p className="text-sm text-muted-foreground">Perfect for social or competitive events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}