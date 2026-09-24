import type { AppConfig } from '../config/config';
import type { Logger } from '../config/logger';
import type { AuthService } from '../services/auth.service';
import type { ExecutionService } from '../services/execution.service';
import type { SnippetService } from '../services/snippet.service';
import type { TokenService } from '../services/token.service';

export interface AppDependencies {
  config: AppConfig;
  logger: Logger;
  tokenService: TokenService;
  authService: AuthService;
  snippetService: SnippetService;
  executionService: ExecutionService;
  isDatabaseHealthy: () => boolean;
}
