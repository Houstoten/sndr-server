import { rule } from "graphql-shield";

export const isAuthenticated = rule()(async (parent, args, ctx, info) => {
    if (ctx.request.claims === null) {
        ctx.response.statusCode = 401

        return false;
    }

    return true;
});
