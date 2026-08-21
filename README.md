# Runtime Foundation

Local development requires Node.js 22.13 or newer in the Node 22 line, or Node
24; npm enforces the `>=22.13.0 <23 || >=24.0.0` engine contract.

See [local development setup](docs/development.md) for startup instructions and local environment guidance.

## Bedrock configuration

Set exactly one Bedrock model reference in the root `.env` file:

- `BEDROCK_MODEL_ID`, or
- `BEDROCK_INFERENCE_PROFILE_ARN`.

Leave the unused variable empty. AWS credentials must come from the ambient AWS
provider chain, such as an AWS CLI profile or SSO session, an IAM role, or
workload identity. Never store AWS access keys, secret keys, or session tokens
in `.env` or commit them to the repository.
