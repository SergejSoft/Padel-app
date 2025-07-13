import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { runDeploymentSafetyTests, formatDeploymentTestResults, type DeploymentTestResult } from "@/lib/deployment-safety-test";
import { runFoundationTests } from "@/lib/foundation-test";

export default function DeploymentTest() {
  const [deploymentResults, setDeploymentResults] = useState<DeploymentTestResult[]>([]);
  const [foundationResults, setFoundationResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runAllTests = () => {
    setIsRunning(true);
    
    // Run deployment safety tests
    const deployTests = runDeploymentSafetyTests();
    setDeploymentResults(deployTests);
    
    // Run foundation tests
    const foundTests = runFoundationTests();
    setFoundationResults(foundTests);
    
    setIsRunning(false);
  };

  const allDeploymentTestsPassed = deploymentResults.length > 0 && 
    deploymentResults.every(result => result.passed);
  
  const allFoundationTestsPassed = foundationResults.length > 0 && 
    foundationResults.every(result => result.passed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Deployment Safety Tests</h1>
          <p className="text-gray-600">Verify system integrity before deployment</p>
        </div>

        <div className="mb-6 text-center">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Shield className="h-5 w-5 mr-2" />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>

        {(deploymentResults.length > 0 || foundationResults.length > 0) && (
          <Alert className={`mb-6 ${allDeploymentTestsPassed && allFoundationTestsPassed ? 'border-green-500' : 'border-red-500'}`}>
            <AlertDescription className="flex items-center gap-2">
              {allDeploymentTestsPassed && allFoundationTestsPassed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">SAFE TO DEPLOY - All tests passed</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800">DO NOT DEPLOY - Some tests failed</span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Deployment Safety Tests */}
        {deploymentResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Deployment Safety Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deploymentResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        {result.testName}
                      </h3>
                      <span className={`text-sm font-medium ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    {result.error && (
                      <Alert className="mb-2 border-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                    {result.details && (
                      <div className="bg-gray-50 rounded p-3 text-sm">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Foundation Tests */}
        {foundationResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Foundation Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {foundationResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        {result.testName}
                      </h3>
                      <span className={`text-sm font-medium ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    {result.error && (
                      <Alert className="mb-2 border-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Summary */}
        {deploymentResults.length > 0 && (
          <div className="mt-6 bg-gray-100 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Test Summary</h3>
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {formatDeploymentTestResults(deploymentResults)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}