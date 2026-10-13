---
name: codebase-design
description: Use when designing modules and interfaces, or reviewing a structure for depth and locality. Trigger on deciding where a seam goes, shaping a module's interface, judging whether a module is deep or shallow, or making code more testable or navigable. Do not use for routine implementation inside an already-settled design.
---

# Codebase Design

Design **deep modules**: a lot of behavior behind a small interface, placed at a clean seam, testable through that interface. The aim is leverage for callers, locality for maintainers, and testability for everyone.

## Overview

A module is anything with an interface and an implementation, at any scale: a function, a class, a package, or a tier-spanning slice. Its **interface** is everything a caller must know to use it correctly: the type signature, plus invariants, ordering constraints, error modes, required configuration, and performance characteristics. Its **implementation** is the body of code inside.

A module is **deep** when a large amount of behavior sits behind a small interface, and **shallow** when the interface is nearly as complex as the implementation. Depth is leverage: more capability per unit of interface a caller or test has to learn. It is also locality: change, bugs, knowledge, and verification concentrate in one place instead of spreading across callers.

Depth is a property of the interface, not the implementation. A deep module can be internally composed of small, swappable parts; those parts are simply not part of the interface.

## When to Use

- You are designing a module's interface or deciding what it should expose.
- You are reviewing a structure for depth and locality, or for shallow sprawl.
- You are deciding where a seam goes, or whether one is warranted at all.
- You want the code to be more testable or easier for a reader to navigate.
- You are judging whether an existing module earns its keep.

## Process

### 1. Name the module and its interface

State what the module is and everything a caller must know to use it. Include the non-type facts: invariants, ordering, error modes, configuration, and performance. If the interface cannot be written down, it is not yet designed.

### 2. Apply the deletion test

Imagine deleting the module. If the complexity vanishes, it was a pass-through. If the complexity reappears across N callers, it was earning its keep. A module that only forwards calls is a shallow one.

### 3. Prefer depth

Ask whether the interface can be smaller: fewer methods, simpler parameters, more complexity hidden inside. Move behavior behind the interface rather than widening it. Internal parts stay private even when they are individually small and swappable.

### 4. Place the seam deliberately

A **seam** is a place where behavior can change without editing in that place: the location at which the interface lives. Where the seam goes is its own decision, separate from what goes behind it. Put it where variation is real, not where it is imagined.

### 5. Introduce a seam only when something varies across it

An **adapter** is a concrete thing that satisfies the interface at a seam. One adapter means a hypothetical seam. Two adapters means a real one. Do not introduce a seam unless something actually varies across it.

### 6. Design the interface as the test surface

Callers and tests cross the same seam. If you want to test past the interface, the module is probably the wrong shape. Make testing natural: accept dependencies instead of creating them, return results instead of producing side effects, and keep the surface small.

### 7. Optimize for locality

Keep change, knowledge, and verification in one place. Fix once, fixed everywhere. A design that scatters a single rule across many callers costs every future change.

## Gates

- **Depth is a property of the interface.** A large implementation behind a small interface is deep; an interface as complex as its implementation is shallow.
- **The interface is the test surface.** Callers and tests cross the same seam. Testing past the interface signals the wrong shape.
- **One adapter is a hypothetical seam.** A seam is introduced only when something actually varies across it; two adapters make it real.
- **The deletion test passes.** Deleting the module would scatter its complexity across callers, not remove it.
- **Locality holds.** Change and verification concentrate in one place rather than spreading across callers.
- **Dependencies are accepted, not created, and results are returned, not produced as side effects.**

## Anti-patterns

- Shallow sprawl: a large interface over a thin implementation that mostly passes calls through.
- Widening the interface to avoid hiding complexity inside.
- Introducing a seam for a single adapter, when nothing varies across it yet.
- Testing past the interface because the module is the wrong shape.
- Creating dependencies inside a module instead of accepting them.
- Mutating shared state as a side effect instead of returning a result.
- Spreading one rule across many callers instead of keeping it local.

<!-- generated by skill-recipe
from: mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/engineering/codebase-design/SKILL.md
license: MIT (dev-only snapshot: skill-sources/mattpocock-skills/LICENSE in the repo) -->
