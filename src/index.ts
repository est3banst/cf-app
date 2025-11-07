/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


type UserService = {
  userId: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
};

type Provider = {
	id: string;
	name: string;
	skills: string;
	email: string;
	category: string;
	description: string;
}
type Env = {
	DB : D1Database;
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

	const allowedUrls = [
		"https://www.kustomdev.com",
		"https://localhost:5173",
		"http://localhost:5173"
	]
	const origin = request.headers.get("Origin") || "";

	const corsOrigin = allowedUrls.includes(origin) ? origin : allowedUrls[0];
    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/api/services" && request.method === "POST") {
      try {
        const data = await request.json();
        const { userId, providerId, title, description, price } = data as UserService;

        if (!userId || !providerId || !title || !description) {
          return new Response(JSON.stringify({ error: "Missing fields" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        }

        const result = await env.u_projects_db.prepare(
          `INSERT INTO services (user_id, provider_id, title, description, price)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(userId, providerId, title, description, price)
          .run();

        return new Response(JSON.stringify({ success: true, id: result.lastRowId }), {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
    }
	if (request.method === "POST" && url.pathname === `/api/providers`) {
  try {
    const { id, name, skills, email, category, description } = await request.json() as Provider;
    await env.u_projects_db.prepare(
      `INSERT INTO providers (id, name, skills, email, category, description)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, name, skills, email, category, description).run();

    	return Response.json({ success: true });
  	} catch (err: any) {
    	return Response.json({ error: err.message }, { status: 500 });
  	}
}

	if (url.pathname === "/api/providers" && request.method === "GET") {
      try {
        const searchTerm = url.searchParams.get("s") || "";
        let query = `SELECT * FROM providers`;
        let params: string[] = [];

        if (searchTerm) {
          query += ` WHERE name LIKE ? OR category LIKE ? OR skills LIKE ?`;
          params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
        }

        const result = await env.u_projects_db.prepare(query).bind(...params).all();

        return new Response(JSON.stringify(result.results || []), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
