import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const BranchId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    return request.headers['x-branch-id'];
  },
);
