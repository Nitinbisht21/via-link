---
name: push-to-git
description: >-
  Use this skill whenever the user says "push to git" or asks to upload their code to GitHub. It automates creating a new branch, committing changes, and pushing to the remote repository.
---

# Push to Git

This skill automates the process of committing and pushing code to GitHub by creating a new branch.

## Execution Steps

When the user triggers this skill (e.g., by saying "push to git"), follow these steps:

1. **Gather Information**: 
   - Check if the user provided a branch name and a commit message in their prompt.
   - If not, ask the user for a commit message, or generate one based on the current changes. You can generate a branch name based on the commit message (e.g., `feature/add-login-button`).
   
2. **View Changes**:
   - Run `git status` to verify there are changes to commit.

3. **Create Branch**:
   - Run `git checkout -b <branch_name>` to create and switch to the new branch.

4. **Stage and Commit**:
   - Run `git add .` to stage all modified files.
   - Run `git commit -m "<commit_message>"` to commit the changes.

5. **Push**:
   - Run `git push -u origin <branch_name>` to push the branch to the remote repository.

6. **Confirm**:
   - Inform the user that the code has been successfully pushed and provide a summary or a link to the branch if possible.
