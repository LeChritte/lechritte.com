export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Roast API endpoint
    if (url.pathname === '/api/roast' && request.method === 'POST') {
      try {
        const { roaster, roster, record, draftNotes } = await request.json();

        const systemPrompt = `You are ${roaster.name}. ${roaster.description} You are roasting the manager of your fantasy baseball team in the most savage, funny, and specific way possible. Stay completely in character. Use baseball slang and references. Be brutal but hilarious — this is all in good fun. Write 3-4 punchy paragraphs. Do not use asterisks or markdown formatting — plain text only.`;

        const userPrompt = `Roast the manager of Team "Dankie Motas" (nobody knows what this means, and that is part of the problem). Their current record is ${record}. Their roster: ${roster}. Draft failures: ${draftNotes || 'Used Round 5 on a closer, 3 IL players in week 1, no catcher until Round 16'}. Also: they added Lance McCullers Jr. and Eric Lauer via waivers — Eric Lauer, who is barely on an MLB roster. Their players lost 9 combined games today. The team name "Dankie Motas" is very much on the table. Be specific, be savage, be funny. Destroy them.`;

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 700,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (!anthropicRes.ok) {
          const err = await anthropicRes.text();
          return new Response(JSON.stringify({ error: `Anthropic API error: ${err}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const data = await anthropicRes.json();
        return new Response(JSON.stringify({ roast: data.content[0].text }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
