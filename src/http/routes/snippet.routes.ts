import { Router } from 'express';
import type { AppDependencies } from '../dependencies';
import { authenticate, currentUserId } from '../middleware/authenticate';
import { createSnippetSchema, updateSnippetSchema } from '../schemas/snippet.schemas';
import { parseBody } from '../validation';

export function createSnippetRouter({ snippetService, tokenService }: AppDependencies): Router {
  const router = Router();

  router.use(authenticate(tokenService));

  router.get('/', async (req, res) => {
    const snippets = await snippetService.list(currentUserId(req));
    res.status(200).json({ data: { snippets } });
  });

  router.post('/', async (req, res) => {
    const snippet = await snippetService.create(
      currentUserId(req),
      parseBody(createSnippetSchema, req.body),
    );
    res.status(201).json({ data: { snippet } });
  });

  router.get('/:id', async (req, res) => {
    const snippet = await snippetService.get(currentUserId(req), req.params.id);
    res.status(200).json({ data: { snippet } });
  });

  router.patch('/:id', async (req, res) => {
    const snippet = await snippetService.update(
      currentUserId(req),
      req.params.id,
      parseBody(updateSnippetSchema, req.body),
    );
    res.status(200).json({ data: { snippet } });
  });

  router.delete('/:id', async (req, res) => {
    await snippetService.delete(currentUserId(req), req.params.id);
    res.status(204).end();
  });

  return router;
}
