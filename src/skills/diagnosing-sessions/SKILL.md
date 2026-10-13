---
name: diagnosing-sessions
description: Use when explicitly invoked to investigate why a past agent session went wrong. Trigger on `@diagnosing-sessions`, or on requests to diagnose, review, or explain a session that stalled, repeated work, ignored a plan, ran over budget, or produced a poor result, for the current session or one named by id or path. Do not use to run the session's work or to change the environment.
---

# Diagnosing Sessions

Pin down what went wrong in a session, read the transcript on disk, and report what happened with evidence. You report; you do not fix.

## Overview

A session that went wrong leaves a transcript, and the transcript holds the answer. The work is forensic: scope the problem with the user, locate the session, read it, and report a timeline of what happened and where it diverged from intent. Every finding cites a `file:line` into the transcript, a log line, or a command you ran; every number comes from the transcript, never from memory. The skill is read-only. It reports findings and stops; it never silently "fixes" the session, edits a transcript, or changes the environment.

## When to Use

- The user invokes `@diagnosing-sessions`, or asks why a session went wrong.
- A session stalled, repeated work, ignored a plan, took too long, cost too much, or produced a poor result.
- The user wants a forensic timeline of a session, current or one named by id or path.
- The user wants a session's evidence turned into a bug report.

Do not use it to run the session's work, to redo what the session attempted, or to change the environment. It reports; the user decides what to change.

## Process

### 1. Scope the problem

Ask one question at a time until you can write a statement naming the session, the turn range if known, what the user expected, what happened, and the observable they care about (wall-clock, tokens, repeated actions, one specific action). "It took too long" is a complaint, not a problem statement. Note whether the goal is a bug report. Nothing below starts until this is answered; if the user is away, write the questions and stop.

### 2. Locate the transcript

Resolve each session to a verified absolute filesystem path. Confirm a past session by quoting its first prompt and timestamp, and list every candidate you rejected with the reason, or "none". Enumerate subagent transcripts. State the path where the report will live, and tell the user.

### 3. Read, then dispatch analysts

Read the region around the reported problem yourself first. Then dispatch one analyst subagent per dimension in parallel, each given the absolute transcript path and one dimension: timeline, plan adherence, repeated work, stumbles, quality evidence, request conflicts, cost and time. Split a dimension by turn range when the transcript is long. Discard any returned finding without a `file:line` citation.

Treat one transcript line as potentially huge; read session files in bounded chunks. Never modify, move, or delete a session file.

### 4. Report with citations

Write a timeline in order, mark where the session diverged from intent, and attach evidence to each finding as a `file:line` citation, a log line, or the command that produced it. State coverage plainly: what you read, and what you skipped. Show the report and give its path. Separate what the cited evidence proves from your own inference.

### 5. Offer follow-ups on request

Only when the user asks, offer to search for similar sessions or to draft a bug report from the findings. Do not act on those offers until the user asks. Pointing at a possible cause is the end of the report; a fix is the user's call.

## Gates

- **Every finding cites a source.** A finding carries a `file:line` citation into the transcript, a log line, or a command you ran. No citation, no finding.
- **Numbers are computed.** Time, tokens, and cost come from the transcript or a command you ran, never from memory.
- **Read-only.** Never modify, move, or delete a session file or any artifact under investigation.
- **Report, do not fix.** Findings are reported, not applied; the environment is not changed, and no fix is made without the user asking.
- **Human prompts only.** Hook output, system reminders, and tool results are not the user's words. In a subagent transcript, "user" is the parent agent.
- **Scope before analysis.** Nothing starts until the problem is scoped; if the user is away, write the questions and stop.

## Anti-patterns

- Editing, moving, or deleting a session file, or any artifact under investigation.
- Silently "fixing" the session or changing the environment instead of reporting.
- A finding with no `file:line`, log, or command citation.
- Recalling cost, time, or token numbers instead of computing them from the transcript.
- Sweeping the whole session before the problem is scoped.
- Treating hook output, system reminders, or tool results as the user's words.
- Naming a defect and proposing a fix when the user asked for a report.

<!-- generated by skill-recipe
     from: obra/superpowers@bb92a77741419a4ab5f06e711a283343f1ada0c3 skills/diagnosing-superpowers/SKILL.md
     license: MIT (dev-only snapshot: skill-sources/superpowers/LICENSE in the repo) -->
