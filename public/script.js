// DOM 元素
const getRecommendationBtn = document.getElementById('get-recommendation-btn');
const loadingElement = document.getElementById('loading');
const cardsContainer = document.getElementById('cards-container');
const cardsWrapper = document.getElementById('cards-wrapper');
const recommendationTextElement = document.getElementById('recommendation-text');
const recommendationTextContent = document.getElementById('recommendation-text-content');
const preferencesSection = document.getElementById('preferences-section');
const preferencesContent = document.getElementById('preferences-content');
const historySection = document.getElementById('history-section');
const historyFoods = document.getElementById('history-foods');

// 弹窗相关元素
const reasonModal = document.getElementById('reason-modal');
const modalFoodName = document.getElementById('modal-food-name');
const modalReason = document.getElementById('modal-reason');
const modalClose = document.getElementById('modal-close');
const modalLikeBtn = document.getElementById('modal-like-btn');

// 已点赞的菜品集合
const likedFoods = new Set();

// 当前弹窗显示的菜品
let currentModalFood = null;

// 食物表情图标映射
const foodEmojis = [
  '🍜', '🍕', '🍔', '🌮', '🍣', '🍱', '🍛', '🍝', 
  '🍲', '🥘', '🍗', '🥩', '🍤', '🥗', '🌯', '🍙',
  '🍚', '🍛', '🍜', '🍲', '🍳', '🥞', '🍕', '🍔'
];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('🍽️ 今天吃啥 - AI智能美食推荐系统已加载');
  initializeEventListeners();
});

// 初始化事件监听器
function initializeEventListeners() {
  // 获取推荐按钮
  getRecommendationBtn.addEventListener('click', async () => {
    await getRecommendations();
  });
  
  // 弹窗关闭按钮
  modalClose.addEventListener('click', closeModal);
  
  // 点击弹窗外部关闭
  reasonModal.addEventListener('click', (e) => {
    if (e.target === reasonModal) {
      closeModal();
    }
  });
  
  // 弹窗点赞按钮
  modalLikeBtn.addEventListener('click', async () => {
    if (currentModalFood) {
      await handleLike(currentModalFood, modalLikeBtn, true);
    }
  });
  
  // ESC键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !reasonModal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

// 获取推荐
async function getRecommendations() {
  try {
    // 显示加载状态
    showLoading(true);
    hideCards();
    hideRecommendationText();
    hidePreferences();
    hideHistory();
    
    // 调用API获取推荐
    console.log('正在获取AI推荐...');
    const response = await fetch('/api/recommendations');
    
    if (!response.ok) {
      throw new Error('获取推荐失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('AI推荐获取成功:', data.recommendations.length, '个推荐');
      
      // 显示推荐语（严格按照要求格式）
      if (data.recommendationText) {
        showRecommendationText(data.recommendationText);
      }
      
      // 显示用户偏好分析
      if (data.preferences && data.preferences.hasData) {
        showPreferences(data.preferences);
      }
      
      // 显示历史点赞记录
      if (data.topLikedFoods && data.topLikedFoods.length > 0) {
        showHistory(data.topLikedFoods);
      }
      
      // 显示推荐卡片
      showCards(data.recommendations);
    } else {
      throw new Error(data.message || '获取推荐失败');
    }
    
  } catch (error) {
    console.error('获取推荐失败:', error);
    showError(error.message || '获取推荐失败，请稍后重试');
  } finally {
    showLoading(false);
  }
}

// 显示加载状态
function showLoading(show) {
  if (show) {
    loadingElement.classList.remove('hidden');
    getRecommendationBtn.disabled = true;
    getRecommendationBtn.textContent = '🍳 正在获取推荐...';
  } else {
    loadingElement.classList.add('hidden');
    getRecommendationBtn.disabled = false;
    getRecommendationBtn.textContent = '🍳 看看今天吃啥';
  }
}

// 显示推荐语
function showRecommendationText(text) {
  recommendationTextContent.textContent = text;
  recommendationTextElement.classList.remove('hidden');
}

// 隐藏推荐语
function hideRecommendationText() {
  recommendationTextElement.classList.add('hidden');
}

// 显示用户偏好分析
function showPreferences(preferences) {
  preferencesContent.innerHTML = '';
  
  // 口味偏好
  const preferenceItem = document.createElement('div');
  preferenceItem.className = 'preference-item highlight';
  preferenceItem.innerHTML = `
    <span class="icon">🎯</span>
    <span>口味偏好：${preferences.preference}</span>
  `;
  preferencesContent.appendChild(preferenceItem);
  
  // 总点赞数
  const likesItem = document.createElement('div');
  likesItem.className = 'preference-item';
  likesItem.innerHTML = `
    <span class="icon">❤️</span>
    <span>总点赞数：${preferences.totalLikes}</span>
  `;
  preferencesContent.appendChild(likesItem);
  
  // 最爱菜品
  if (preferences.topFoods && preferences.topFoods.length > 0) {
    const topFoodsItem = document.createElement('div');
    topFoodsItem.className = 'preference-item';
    topFoodsItem.innerHTML = `
      <span class="icon">🏆</span>
      <span>最爱：${preferences.topFoods.join('、')}</span>
    `;
    preferencesContent.appendChild(topFoodsItem);
  }
  
  // 详细描述
  if (preferences.detail) {
    const detailItem = document.createElement('div');
    detailItem.className = 'preference-item';
    detailItem.innerHTML = `
      <span class="icon">💡</span>
      <span>${preferences.detail}</span>
    `;
    preferencesContent.appendChild(detailItem);
  }
  
  preferencesSection.classList.remove('hidden');
}

// 隐藏用户偏好分析
function hidePreferences() {
  preferencesSection.classList.add('hidden');
}

// 显示历史点赞记录
function showHistory(historyFoodsList) {
  historyFoods.innerHTML = '';
  
  historyFoodsList.forEach(food => {
    const item = document.createElement('div');
    item.className = 'history-food-item';
    item.innerHTML = `
      <span class="history-food-name">${escapeHtml(food.food_name)}</span>
      <span class="history-food-likes">❤️ ${food.like_count}</span>
    `;
    historyFoods.appendChild(item);
  });
  
  historySection.classList.remove('hidden');
}

// 隐藏历史点赞记录
function hideHistory() {
  historySection.classList.add('hidden');
}

// 显示卡片
function showCards(recommendations) {
  // 清空之前的卡片
  cardsWrapper.innerHTML = '';
  
  // 生成新卡片
  recommendations.forEach((food, index) => {
    const card = createFoodCard(food, index);
    cardsWrapper.appendChild(card);
  });
  
  // 显示卡片容器
  cardsContainer.classList.remove('hidden');
  
  // 添加滚动动画
  setTimeout(() => {
    cardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// 隐藏卡片
function hideCards() {
  cardsContainer.classList.add('hidden');
}

// 创建菜品卡片
function createFoodCard(food, index) {
  const card = document.createElement('div');
  card.className = 'food-card';
  
  // 随机选择一个表情
  const emoji = foodEmojis[index % foodEmojis.length];
  
  // 检查是否已点赞
  const isLiked = likedFoods.has(food.name);
  
  card.innerHTML = `
    <div class="card-number">${index + 1}</div>
    <div class="food-card-header">
      <div class="food-emoji">${emoji}</div>
    </div>
    <div class="food-card-content">
      <h3 class="food-name">
        ${escapeHtml(food.name)}
        <span class="ai-tag">🤖 AI推荐</span>
      </h3>
      <p class="food-description">${escapeHtml(food.description || '')}</p>
      
      <!-- 推荐理由标签 -->
      <div class="reason-tag" data-food-name="${escapeHtml(food.name)}" data-reason="${escapeHtml(food.reason || '')}">
        <span class="icon">💡</span>
        <span>查看推荐理由</span>
      </div>
      
      <div class="like-section">
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-food-name="${escapeHtml(food.name)}">
          <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
          <span class="like-text">${isLiked ? '已点赞' : '点赞'}</span>
        </button>
        <span class="like-count" id="like-count-${encodeId(food.name)}">${isLiked ? '1' : '0'}</span>
      </div>
    </div>
  `;
  
  // 添加推荐理由标签点击事件
  const reasonTag = card.querySelector('.reason-tag');
  reasonTag.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(food.name, food.reason || '这是一道非常美味的菜品，值得一试！');
  });
  
  // 添加点赞按钮事件
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLike(food.name, likeBtn, false);
  });
  
  return card;
}

// 打开推荐理由弹窗
function openModal(foodName, reason) {
  currentModalFood = foodName;
  
  modalFoodName.textContent = foodName;
  modalReason.textContent = reason;
  
  // 更新弹窗点赞按钮状态
  const isLiked = likedFoods.has(foodName);
  updateModalLikeButton(isLiked);
  
  reasonModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// 关闭弹窗
function closeModal() {
  reasonModal.classList.add('hidden');
  document.body.style.overflow = '';
  currentModalFood = null;
}

// 更新弹窗点赞按钮状态
function updateModalLikeButton(isLiked) {
  const likeIcon = modalLikeBtn.querySelector('.like-icon');
  
  if (isLiked) {
    modalLikeBtn.classList.add('liked');
    likeIcon.textContent = '❤️';
    modalLikeBtn.innerHTML = '<span class="like-icon">❤️</span> 已点赞';
  } else {
    modalLikeBtn.classList.remove('liked');
    likeIcon.textContent = '🤍';
    modalLikeBtn.innerHTML = '<span class="like-icon">🤍</span> 为这道菜点赞';
  }
}

// 处理点赞
async function handleLike(foodName, likeBtn, isFromModal) {
  // 如果已经点赞，不重复处理
  if (likedFoods.has(foodName)) {
    showToast('您已经点赞过了哦');
    return;
  }
  
  try {
    console.log(`正在为「${foodName}」点赞...`);
    
    // 调用点赞API
    const response = await fetch('/api/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ foodName }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 更新UI
      likedFoods.add(foodName);
      
      // 更新卡片点赞按钮状态
      if (!isFromModal && likeBtn) {
        updateLikeButton(likeBtn, true);
      }
      
      // 更新弹窗点赞按钮状态
      if (currentModalFood === foodName) {
        updateModalLikeButton(true);
      }
      
      // 更新所有同名菜品的点赞按钮
      updateAllLikeButtons(foodName, true);
      
      // 更新点赞数显示
      const likeCountEl = document.getElementById(`like-count-${encodeId(foodName)}`);
      if (likeCountEl) {
        likeCountEl.textContent = data.data.likeCount;
      }
      
      console.log(`「${foodName}」点赞成功，当前点赞数：${data.data.likeCount}`);
      showToast(`已为「${foodName}」点赞！AI会根据您的口味调整推荐`);
    } else {
      throw new Error(data.message || '点赞失败');
    }
    
  } catch (error) {
    console.error('点赞失败:', error);
    showToast(error.message || '点赞失败，请稍后重试');
  }
}

// 更新单个点赞按钮
function updateLikeButton(btn, isLiked) {
  const likeIcon = btn.querySelector('.like-icon');
  const likeText = btn.querySelector('.like-text');
  
  if (isLiked) {
    btn.classList.add('liked');
    likeIcon.textContent = '❤️';
    likeText.textContent = '已点赞';
  } else {
    btn.classList.remove('liked');
    likeIcon.textContent = '🤍';
    likeText.textContent = '点赞';
  }
}

// 更新所有同名菜品的点赞按钮
function updateAllLikeButtons(foodName, isLiked) {
  const allLikeBtns = document.querySelectorAll(`.like-btn[data-food-name="${escapeHtml(foodName)}"]`);
  allLikeBtns.forEach(btn => {
    updateLikeButton(btn, isLiked);
  });
}

// 显示错误信息
function showError(message) {
  // 移除之前的错误提示
  const existingError = document.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  // 创建新的错误提示
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  // 插入到按钮下方
  const buttonContainer = document.querySelector('.button-container');
  buttonContainer.parentNode.insertBefore(errorDiv, buttonContainer.nextSibling);
  
  // 5秒后自动移除
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// 显示提示
function showToast(message) {
  // 移除之前的提示
  const existingToast = document.querySelector('.success-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 创建新的提示
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // 2秒后自动移除
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease-out reverse';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}

// HTML转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 编码ID
function encodeId(id) {
  return btoa(encodeURIComponent(id)).replace(/[^a-zA-Z0-9]/g, '');
}
