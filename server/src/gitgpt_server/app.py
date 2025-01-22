import os
from flask import Flask, request, jsonify
from groq import Groq
from dotenv import load_dotenv
from .prompt import SECURITY_CHECK, TOOLS_PROMPT

load_dotenv()
app = Flask(__name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def llm_call(model, messages, temperature, tool_use):
    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=1024,
        top_p=1,
        tools=TOOLS_PROMPT if tool_use else None,
        tool_choice="auto" if tool_use else "none",
        seed=42,
    )

    message = completion.choices[0].message
    content = message.content
    tool_calls = [
        {
            "id": tool_call.id,
            "function": {
                "name": tool_call.function.name,
                "arguments": tool_call.function.arguments,
            },
        }
        for tool_call in message.tool_calls or []
    ]
    return content, tool_calls


def security_check(command: str) -> bool:
    messages = [
        {
            "role": "system",
            "content": SECURITY_CHECK,
        },
        {
            "role": "user",
            "content": command,
        },
    ]

    content = llm_call("llama-3.1-8b-instant", messages, 1.0, True)
    return "Y" in content and "N" not in content


@app.route("/call-llm", methods=["POST"])
def call_llm():
    data = request.get_json()
    model = "llama-3.3-70b-versatile"
    messages = data.get("messages", [])
    temperature = data.get("temperature", 1.0)
    tool_use = data.get("toolUse", True)

    content, tool_calls = llm_call(model, messages, temperature, tool_use)
    return jsonify({"role": "assistant", "content": content, "tool_calls": tool_calls})


@app.route("/security-check", methods=["POST"])
def security_check():
    data = request.get_json()
    command = data.get("command", "")
    # TODO: Implement real security check, bypass all command temporarily
    # check_result = security_check(command)
    return jsonify({"is_safe": False})


def main():
    app.run(host="0.0.0.0", port=5001, debug=True)
