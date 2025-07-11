/**
 * Foundation Test Page - Manual testing interface for the tournament foundation
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Play, RotateCcw, TestTube } from "lucide-react";
import { runFoundationTests, type TestResult } from "@/lib/foundation-test";
import { useAuth } from "@/hooks/useAuth";

export default function FoundationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const { user } = useAuth();

  const runTests = async () => {
    setIsRunning(true);
    
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const results = runFoundationTests();
      setTestResults(results);
      setLastRun(new Date());
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const passedTests = testResults.filter(t => t.passed).length;
  const failedTests = testResults.filter(t => !t.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TestTube className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Foundation Test Suite</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comprehensive validation of the tournament management system foundation. 
            Tests scoring rules, leaderboard calculation, American format generation, and validation logic.
          </p>
        </div>

        {/* Admin Notice */}
        {(!user || user.role !== 'admin') && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertDescription>
              This is a development testing page. Access is restricted to administrators.
            </AlertDescription>
          </Alert>
        )}

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3">
                <Button 
                  onClick={runTests} 
                  disabled={isRunning}
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run All Tests
                    </>
                  )}
                </Button>
                
                {testResults.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setTestResults([])}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear Results
                  </Button>
                )}
              </div>
              
              {lastRun && (
                <div className="text-sm text-gray-600">
                  Last run: {lastRun.toLocaleTimeString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{totalTests}</div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
              
              {failedTests === 0 && totalTests > 0 && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 All foundation tests passed! The tournament system is solid and ready.
                  </AlertDescription>
                </Alert>
              )}
              
              {failedTests > 0 && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ {failedTests} test(s) failed. Please review the foundation implementation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Individual Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Individual Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${
                      result.passed 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{result.testName}</h3>
                          {result.error && (
                            <p className="text-sm text-red-600 mt-1">
                              Error: {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={result.passed ? "default" : "destructive"}>
                        {result.passed ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                    
                    {result.details && (
                      <details className="mt-3">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {testResults.length === 0 && !isRunning && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Test</h3>
              <p className="text-gray-600 mb-6">
                Click "Run All Tests" to validate the tournament foundation components.
              </p>
              <Button onClick={runTests} className="flex items-center gap-2 mx-auto">
                <Play className="h-4 w-4" />
                Run Foundation Tests
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}