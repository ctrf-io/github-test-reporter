# Integrations

GitHub Test Reporter supports various integrations to enhance your test reporting workflow. These integrations allow you to seamlessly combine the GitHub Test Reporter with popular developer tools.

You can use multiple integrations in the same workflow.

Integrations are currently in beta. Please report any issues to the [GitHub Test Reporter repository](https://github.com/ctrf-io/github-test-reporter/issues).

| Integration | Description | Repository |
|------------|-------------|------------|
| Slack Test Reporter | Send test results and notifications to Slack channels | [ctrf-io/slack-test-reporter](https://github.com/ctrf-io/slack-test-reporter) |
| Microsoft Teams Test Reporter | Post test results and alerts to Teams channels | [ctrf-io/teams-test-reporter](https://github.com/ctrf-io/teams-test-reporter) |
| AI Test Reporter | Intelligent test analysis using leading AI models | [ctrf-io/ai-test-reporter](https://github.com/ctrf-io/ai-test-reporter) |
| JUnit to CTRF | Convert JUnit test results to CTRF format | [ctrf-io/junit-to-ctrf](https://github.com/ctrf-io/junit-to-ctrf) |

To suggest a new integration, please open a discussion on the [CTRF Discussions](https://github.com/ctrf-io/ctrf/discussions).

## Configuration

Integrations are configured using the `integrations-config` input in your GitHub Actions workflow. The configuration is passed as a JSON string:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    integrations-config: |
      {
        "slack": {
          "enabled": true,
          "action": "results"
        },
        "teams": {
          "enabled": true,
          "action": "results"
        },
        "ai": {
          "enabled": true,
          "action": "openai"
        }
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
    TEAMS_WEBHOOK_URL: ${{ secrets.TEAMS_WEBHOOK_URL }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  if: always()
```

## Available Integrations

### Slack Integration

The Slack integration allows you to send test results directly to your Slack channels.

The Slack integration is powered by the [Slack Test Reporter](https://github.com/ctrf-io/slack-test-reporter), see the latest documentation for more information.

Actions available:

- `results`
- `failed`
- `flaky`
- `ai`

Requires the `SLACK_WEBHOOK_URL` environment variable to be set.

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    integrations-config: |
      {
        "slack": {
          "enabled": true,
          "action": "results",
          "options": {
            "title": "Test Results",
            "prefix": "Custom prefix",
            "suffix": "Custom suffix",
            "consolidated": false,
            "onFailOnly": false
          }
        }
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  if: always()
```

See the [Slack Test Reporter](https://github.com/ctrf-io/slack-test-reporter) for more information.

### Microsoft Teams Integration

The Microsoft Teams integration allows you to send test results directly to your Microsoft Teams channels.

The Microsoft Teams integration is powered by the [Microsoft Teams Test Reporter](https://github.com/ctrf-io/teams-test-reporter), see the documentation for more information.

Actions available:

- `results`
- `failed`
- `flaky`
- `ai`

Requires the `TEAMS_WEBHOOK_URL` environment variable to be set.

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    integrations-config: |
      {
        "teams": {
          "enabled": true,
          "action": "results",
          "options": {
            "title": "Test Results",
            "onFailOnly": false
          }
        }
      }
  env:
    TEAMS_WEBHOOK_URL: ${{ secrets.TEAMS_WEBHOOK_URL }}
  if: always()
```

See the [Microsoft Teams Test Reporter](https://github.com/ctrf-io/teams-test-reporter) for more information.

### AI Integration

The AI integration provides intelligent analysis of your test results using advanced AI models.

The AI integration is powered by the [AI Test Reporter](https://github.com/ctrf-io/ai-test-reporter), see the latestdocumentation for more information.

Actions available:

- `openai`
- `claude`
- `azure-openai`
- `grok`
- `deepseek`
- `mistral`
- `gemini`
- `perplexity`
- `openrouter`

Requires the environment variable to be set for the AI provider you are using.

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    integrations-config: |
      {
        "ai": {
          "enabled": true,
          "action": "openai",
          "options": {
            "model": "gpt-4",
            "systemPrompt": "Custom system prompt",
            "frequencyPenalty": 0,
            "maxTokens": 1000,
            "presencePenalty": 0,
            "temperature": 0.7,
            "topP": 1,
            "log": false,
            "maxMessages": 10,
            "consolidate": false,
            "deploymentId": "your-azure-deployment-id"
          }
        }
      }
  env:
    OPENAI_TOKEN: ${{ secrets.OPENAI_TOKEN }}
  if: always()
```

### JUnit to CTRF Integration

The JUnit to CTRF integration allows you to convert JUnit test results to CTRF format.

The JUnit to CTRF integration is powered by the [JUnit to CTRF](https://github.com/ctrf-io/junit-to-ctrf), see the latest documentation for more information.

Actions available:

- `convert`

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './target/surefire-reports/*.xml'
    integrations-config: |
      {
        "junit-to-ctrf": {
          "enabled": true,
          "action": "convert",
          "options": {
            "output": "./ctrf-reports/ctrf-report.json",
            "toolname": "junit-to-ctrf",
            "useSuiteName": false,
            "env": {
              "appName": "my-app"
            }
          }
        }
      }
  if: always()
```

See the [JUnit to CTRF](https://github.com/ctrf-io/junit-to-ctrf) for more information.

