import json
from app.models.user import UserProfile


SYSTEM_PROMPT_TEMPLATE = """你是 NutriHealth AI，一个专业的 AI 营养健康决策助手。

你的定位是：围绕用户真实生活场景，将专业健康知识、个人上下文、食品与营养数据及可靠证据结合，为用户提供可解释、安全且可执行的日常健康决策支持。

## 用户画像
{user_profile_section}

## 回答格式
你必须使用以下结构化格式回答用户的问题：

## 先说结论
[直接给出核心结论或建议]

## 为什么
[解释原因和逻辑]

## 根据你的情况
[结合用户个人画像和当前场景的具体分析]

## 可以怎么做
[具体可执行的行动建议，分点列出]

## 依据
[支持结论的依据，如膳食指南、营养学原理等]

## 注意
[需要用户注意的事项、风险提示或建议咨询专业人士的情况]

## 回答原则
- 温和、清晰、不过度绝对化
- 不制造健康焦虑
- 不进行疾病诊断或开具处方
- 如遇高风险问题（紧急症状、疾病诊断请求、药物高风险问题等），不诊断、不处方，建议用户寻求专业医疗帮助
- 如果信息不足以下结论，请坦诚说明并告知需要补充什么信息
- 回答使用中文
"""


def build_system_prompt(profile: UserProfile) -> str:
    """Build the system prompt with the user's profile context."""
    food_prefs = profile.food_preferences or "[]"
    allergies = profile.allergies or "[]"

    try:
        food_prefs_list = json.loads(food_prefs)
        food_prefs_text = "、".join(food_prefs_list) if food_prefs_list else "无特殊偏好"
    except (json.JSONDecodeError, TypeError):
        food_prefs_text = food_prefs

    try:
        allergies_list = json.loads(allergies)
        allergies_text = "、".join(allergies_list) if allergies_list else "无"
    except (json.JSONDecodeError, TypeError):
        allergies_text = allergies

    profile_section = f"""- 年龄: {profile.age}
- 性别: {profile.sex}
- 身高: {profile.height}cm
- 体重: {profile.weight}kg
- 健康目标: {profile.goal}
- 活动水平: {profile.activity_level}
- 工作时间: {profile.work_schedule}
- 饮食偏好: {profile.diet_preference}
- 食物喜好: {food_prefs_text}
- 过敏: {allergies_text}"""

    return SYSTEM_PROMPT_TEMPLATE.format(user_profile_section=profile_section)


def build_system_prompt_with_rag(profile: UserProfile, retrieved_chunks: list[dict]) -> str:
    """Build system prompt with user profile AND retrieved knowledge context."""
    base_prompt = build_system_prompt(profile)

    if not retrieved_chunks:
        return base_prompt

    knowledge_sections = []
    for i, chunk in enumerate(retrieved_chunks, 1):
        knowledge_sections.append(
            f"[{i}] 来源: {chunk.get('source', '未知')}\n"
            f"    标题: {chunk.get('title', '未知')}\n"
            f"    章节: {chunk.get('section', '')}\n"
            f"    证据等级: {chunk.get('evidence_level', 'C')}\n"
            f"    内容: {chunk['content']}"
        )
    knowledge_text = "\n\n".join(knowledge_sections)

    knowledge_section = (
        "\n\n## 知识库参考\n"
        "以下是从知识库中检索到的相关专业知识。请基于这些知识回答用户问题，"
        "并在「依据」部分标注引用了哪些知识来源（用 [1] [2] 等序号标注）。\n"
        "如果知识库内容与用户问题不完全相关，请自行判断是否采用。\n"
        "不要编造未在知识库中出现的来源。\n\n"
        f"{knowledge_text}"
    )

    return base_prompt + knowledge_section
