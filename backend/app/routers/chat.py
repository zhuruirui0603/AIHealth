import json
import asyncio

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.schemas.chat import ChatRequest
from app.services.llm_service import LLMService
from app.services.prompt_builder import build_system_prompt_with_rag
from app.services.conversation_service import ConversationService
from app.services.retrieval_service import RetrievalService
from app.config import settings

router = APIRouter()


@router.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Send a message and get a streaming SSE response from the LLM.
    Includes RAG knowledge retrieval and source citation.
    """
    conv_service = ConversationService()
    try:
        # 1. Get or create conversation
        conversation = conv_service.get_or_create(request.conversation_id)

        # 2. Persist user message
        conv_service.add_message(
            conversation_id=conversation.id,
            role="user",
            content=request.message,
        )

        # 3. RAG: Retrieve relevant knowledge
        retrieved_dicts = []
        retrieval_service = RetrievalService()
        try:
            retrieved = retrieval_service.search(request.message, top_k=settings.rag_top_k)
            retrieved_dicts = [r.to_dict() for r in retrieved]
        except Exception as e:
            print(f"[RAG] Retrieval error: {e}")
        finally:
            retrieval_service.close()

        # 4. Build messages array for LLM with RAG context
        profile = conv_service.get_user_profile()
        system_prompt = build_system_prompt_with_rag(profile, retrieved_dicts)

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conv_service.get_history(conversation.id))

        # 5. Stream LLM response
        llm = LLMService()

        async def event_generator():
            full_response = []

            # Send retrieved sources as a pre-stream event
            if retrieved_dicts:
                yield {
                    "event": "sources",
                    "data": json.dumps(
                        {"sources": retrieved_dicts},
                        ensure_ascii=False,
                    ),
                }

            try:
                for chunk in llm.stream_chat(messages):
                    full_response.append(chunk)
                    yield {"event": "token", "data": json.dumps({"content": chunk}, ensure_ascii=False)}
                    await asyncio.sleep(0)
            except Exception as e:
                yield {"event": "error", "data": json.dumps({"message": str(e)}, ensure_ascii=False)}
                return

            # Persist complete assistant response
            full_text = "".join(full_response)
            conv_service.add_message(
                conversation_id=conversation.id,
                role="assistant",
                content=full_text,
            )

            # Auto-generate conversation title from dialogue summary
            if conversation.title == "新对话":
                try:
                    history = conv_service.get_history(conversation.id)
                    title = llm.summarize_conversation(history)
                    if title:
                        conv_service.update_title(conversation.id, title)
                        conversation.title = title
                except Exception:
                    pass

            yield {
                "event": "done",
                "data": json.dumps(
                    {
                        "conversation_id": conversation.id,
                        "full_response": full_text,
                        "sources": retrieved_dicts,
                    },
                    ensure_ascii=False,
                ),
            }

        return EventSourceResponse(event_generator())
    finally:
        conv_service.close()
