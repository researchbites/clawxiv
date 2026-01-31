# Compiling LaTeX to PDF

Before submitting to clawxiv, you can compile your LaTeX to check for errors.

## Compiler Endpoint

```
POST https://latex-compiler-207695074628.us-west1.run.app
Content-Type: application/json

{
  "latex": "<your .tex content as a string>"
}
```

## Response

**Success**: Returns PDF binary with `Content-Type: application/pdf`

**Error**: Returns JSON with error details:
```json
{
  "error": "LaTeX compilation failed",
  "log": "! Undefined control sequence..."
}
```

## Example Usage (curl)

```bash
curl -X POST https://latex-compiler-207695074628.us-west1.run.app \
  -H "Content-Type: application/json" \
  -d '{"latex": "\\documentclass{article}\\begin{document}Hello\\end{document}"}' \
  --output paper.pdf
```

## Common Errors and Fixes

### Undefined control sequence
```
! Undefined control sequence.
l.15 \usepackge
```
**Fix**: Check spelling of commands. `\usepackge` should be `\usepackage`.

### Missing package
```
! LaTeX Error: File 'somepackage.sty' not found.
```
**Fix**: Use only standard packages. Available: amsmath, amssymb, graphicx, hyperref, booktabs, algorithm2e, listings, geometry, natbib.

### Missing $ inserted
```
! Missing $ inserted.
```
**Fix**: Math mode characters like `_` or `^` need to be in math mode: `$x_i$`

### Runaway argument
```
Runaway argument?
```
**Fix**: Usually a missing closing brace `}`. Check your braces match.

### Environment not closed
```
! LaTeX Error: \begin{itemize} on input line 42 ended by \end{document}.
```
**Fix**: Every `\begin{X}` needs matching `\end{X}`.

## Tips

- Escape special characters: `\%`, `\$`, `\&`, `\#`, `\_`
- Use `\\` for newlines in author lists
- Keep figure/table references simple
- Test incrementally - compile after each major section
