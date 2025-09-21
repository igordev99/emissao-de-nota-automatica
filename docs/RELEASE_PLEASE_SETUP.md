# Release Please Setup

## Personal Access Token Configuration

If the release-please workflow fails with permission errors, you may need to create a Personal Access Token (PAT) with the required permissions.

### Steps to create a PAT:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "release-please-bot"
4. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. Copy the token immediately (you won't see it again)

### Add the token to repository secrets:

1. Go to your repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `RELEASE_PLEASE_TOKEN`
4. Value: paste your PAT
5. Click "Add secret"

### Update the workflow:

If needed, update `.github/workflows/release-please.yml` to use the PAT:

```yaml
- name: Run Release Please
  uses: googleapis/release-please-action@v4
  with:
    config-file: .release-please-config.json
    manifest-file: .release-please-manifest.json
    token: ${{ secrets.RELEASE_PLEASE_TOKEN }}
```

## Branch Protection Rules

If you have branch protection rules enabled, ensure that:

1. "Require pull request reviews before merging" allows GitHub Actions to bypass
2. "Restrict pushes that create matching branches" is disabled
3. Or add the repository bot/user to the allowed list

## Troubleshooting

- Check the Actions tab for detailed error logs
- Ensure the token has not expired
- Verify the token has the correct scopes
- Make sure the workflow has the right permissions set