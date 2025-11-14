// Unified Prompt Management System
// Contains all prompts used in the knowledge content generation application

export const PROMPTS = {
  // Prompt rewriting
  REWRITE_PROMPT: `
    请将以下用户输入重新表述，使其更专业、具体、适合知识内容生成。
    分析该主题是否可能包含代码示例和公式，如果可以，请在重写时特别强调必须包含这些元素。
    不要输出任何其他内容，仅输出重写后的内容。

    原输入：{userInput}

    重写要求：
    1. 明确主题和概念
    2. 保持用户意图
    3. 使表述更学术化
    4. 增加必要的技术性描述
    5. 重点分析：该主题是否适合使用代码示例和数学公式？
       - 如果适合，请在要求中明确指出必须包含代码示例和数学公式
       - 代码示例应使用 Markdown 格式的代码块
       - 公式应使用 LaTeX 格式或清晰的文字描述
    6. 确保表述清晰、无歧义

    请提供重写后的内容，特别注明是否需要包含代码示例和/或数学公式：
  `,

  // Search planning
  SEARCH_PLAN_PROMPT: `
    为以下主题生成多代理搜索规划，要求生成简洁明了的搜索查询语句：
    主题：{topic}

    搜索规划要求：
    1. 生成5-10个不同的搜索查询语句
    2. 每个查询语句简短明确，适合搜索引擎理解
    3. 覆盖定义、核心概念、技术细节、实际应用、发展历史、面临挑战、解决方案等方面
    4. 查询语句应类似于："TOPIC 定义"、"TOPIC 应用实例"、"TOPIC 发展历程"等
    5. 避免生成包含完整句子或段落的查询，只提供搜索关键词

    示例格式：
    - "量子学习 定义 概念"  
    - "量子学习 核心技术 原理"
    - "量子学习 实际应用 案例"
    
    请严格按照以下JSON格式返回：
    {
      "queries": ["搜索关键词1", "搜索关键词2", "搜索关键词3", ...]
    }
    
    注意：每个查询项应该是简洁的搜索关键词组合，而不是完整句子或段落。
  `,

  // Search execution - This is used by the SearchService, which takes search queries
  SEARCH_EXECUTION_PROMPT: `
    请为 "{topic}" 这个搜索主题提供相关信息，要求全面、专业，但也要让初学者能够理解。
    
    搜索要求：
    1. 提供该主题的基本定义和核心概念
    2. 涉及的重要知识点、术语和技术分支
    3. 具体应用场景、实际案例和实施方法
    4. 相关的背景知识和前置知识
    5. 发展历史、当前状况和未来趋势
    6. 面临的优势、挑战和解决方案
    7. 关键的技术参数、标准和规范
    8. 与其他相关技术的关联和区别
    
    请以JSON格式返回以下信息：
    {
      "concepts": ["概念1", "概念2", ...],
      "subtopics": ["子主题1", "子主题2", ...],
      "applications": ["应用场景1", "应用场景2", ...],
      "background": ["背景知识1", "背景知识2", ...],
      "trends": ["发展趋势1", "发展趋势2", ...],
      "challenges": ["挑战1", "挑战2", ...],
      "solutions": ["解决方案1", "解决方案2", ...]
    }
  `,

  // Search summarization
  SEARCH_SUMMARY_PROMPT: `
    请根据以下搜索结果生成一个综合性的总结：

    {searchContext}

    总结要求：
    1. 涵盖所有搜索查询的关键信息
    2. 结构化组织信息
    3. 突出重要概念和发现
    4. 为后续内容生成提供基础
    5. 包括关键技术要点、应用场景和相关概念

    请生成详细的总结：
  `,

  // Content generation sections
  SECTION_GENERATION_PROMPT: `
    请基于以下主题和搜索结果，详细撰写 "{sectionTitle}" 部分。

    【重要说明】
    - 本部分是"{topic}"整体内容的一个组成部分，不是独立的完整章节
    - 不要生成总结性内容（因为这是整体内容的一部分，总结将在最后统一处理）
    - 与前后部分保持逻辑连贯
    - 遏免重复其他部分可能涉及的内容
    - 本部分是整体内容的一部分，应专注于"{sectionTitle}"的详细阐述

    主题：{topic}
    搜索结果摘要：{searchSummary}

    内容要求：
    1. 非常深入和专业，但要让小白也能理解
    2. 提供具体的技术细节和示例（包括代码示例和数学公式，如适用）
    3. 保持学术性和可读性
    4. 确保内容详实、有深度
    5. 字数控制在3000-4000字
    6. 如有代码，使用 Markdown 格式展示
    7. 如有公式，使用 LaTeX 格式或清晰描述
    8. 本部分是整体内容的一部分，不要包含总结或结尾部分

    请生成"{sectionTitle}"部分的详细内容，注意这是"{topic}"整体内容的一个组成部分：
  `,

  // Content validation
  CONTENT_VALIDATION_PROMPT: `
    请对以下内容进行验证和优化：

    内容：
    {content}

    验证要求：
    1. 检查逻辑一致性和准确性
    2. 优化结构和表达
    3. 确保专业性与可读性并存
    4. 修正可能的错误
    5. 确保内容深入但易懂
    6. 验证是否包含足够的技术细节和示例

    请返回优化后的内容：
  `,

  // Knowledge base generation
  KNOWLEDGE_BASE_EXTRACTION_PROMPT: `
    从以下内容中提取至少20个初学者可能难以理解的概念、术语和技术名词：

    主题：{topic}
    内容：
    {content}

    提取要求：
    1. 专注于可能难懂的技术术语、概念、缩写、过程、方法等
    2. 优先抽取那些在文中出现但缺乏充分解释的专业词汇
    3. 考虑初学者的认知水平，选择他们可能不熟悉的概念
    4. 确保提取的概念在文中确实出现过
    5. 特别关注那些可能需要用代码示例或数学公式来解释的术语

    请以JSON格式返回以下内容，不要输出其他多余的内容：
    {
      "complexConcepts": [
        {
          "term": "术语或概念名称",
          "locationInContent": "该术语在内容中的大致位置",
          "difficultyLevel": "high|medium|low",
          "briefDescription": "简短描述该术语的作用"
        }
      ]
    }
  `,

  // Concept explanation generation
  CONCEPT_EXPLANATION_PROMPT: `
    请为以下术语 "{conceptTerm}" 生成详细的解释，要求让初学者也能理解，不要输出其他多余的内容，不要输出总结：

    主题背景：{topic}
    概念来源：{locationInContent}
    
    内容上下文（包含此术语的部分）：
    {contentSnippet}

    解释要求：
    1. 通俗易懂的定义
    2. 用简单的类比或比喻来解释
    3. 如适用，提供代码示例（编程/技术概念）
    4. 如适用，提供数学公式（科学概念）
    5. 实际应用场景
    6. 相关概念的联系和区别
    7. 常见误解的澄清
    8. 进阶学习建议（如果需要额外知识）
    9. 示例和使用注意事项
    10. 实践中的重要性

    请生成详细而全面的解释：
  `,

  // Research agent prompt
  RESEARCH_AGENT_PROMPT: `
    请对 "{topic}" 这个主题进行深入研究，并提供详细的信息，包括定义、历史、应用、发展趋势等。研究深度要求：{depth}。

    请特别注意：
    1. 确定是否该主题包含需要代码示例或数学公式来解释的概念
    2. 如果有，特别标记这些需要详细解释的概念
    3. 提供技术背景和实现细节
  `,

  // Generation agent prompt
  GENERATION_AGENT_PROMPT: `
    基于以下研究结果，为 "{topic}" 主题生成详细内容：
    研究结果：{researchResults}
    
    要求：
    - 风格：{style}
    - 目标受众：{targetAudience}
    - 字数：{wordCount}
    - 包含示例：{includeExamples}
    - 必须包含：代码示例和数学公式（如果主题相关）
    - 确保初学者易懂但内容深入专业
    - 结构清晰、内容详实
    
    请生成一篇结构清晰、内容详实的文章，包含代码或公式示例（如适用）。
  `,

  // Expansion agent prompt
  EXPANSION_AGENT_PROMPT: `
    请对术语 "{term}" 进行详细解释：
    上下文：{context}
    主要内容：{content}
    
    要求：
    - 提供准确的定义
    - 解释其在上下文中的具体含义
    - 提供代码示例（如果是技术概念）
    - 提供数学公式（如果是科学概念）
    - 提供1-2个实际例子
    - 列出与该术语相关的其他术语
    - 确保初学者能理解
  `,

  // Validation agent prompt
  VALIDATION_AGENT_PROMPT: `
    请验证以下内容的准确性和完整性：
    内容：{content}
    研究依据：{researchResults}
    
    请评估：
    - 内容的准确性
    - 信息的完整性
    - 是否有逻辑错误
    - 是否需要补充或修正
    - 代码示例和公式是否正确
    - 是否适合初学者理解
  `,

};