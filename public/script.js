// DOM 元素
const getRecommendationBtn = document.getElementById('get-recommendation-btn');
const loadingElement = document.getElementById('loading');
const cardsContainer = document.getElementById('cards-container');
const cardsWrapper = document.getElementById('cards-wrapper');
const recommendationTextElement = document.getElementById('recommendation-text');
const recommendationTextContent = document.getElementById('recommendation-text-content');

// 已点赞的菜品集合
const likedFoods = new Set();

// 食物表情图标映射
const foodEmojis = [
  '🍜', '🍕', '🍔', '🌮', '🍣', '🍱', '🍛', '🍝', 
  '🍲', '🥘', '🍗', '🥩', '🍤', '🥗', '🌯', '🍙',
  '🍚', '🍛', '🍜', '🍲', '🍳', '🥞', '🍕', '🍔'
];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('今天吃啥 - 美食推荐应用已加载');
});

// 获取推荐按钮点击事件
getRecommendationBtn.addEventListener('click', async () => {
  await getRecommendations();
});

// 获取推荐
async function getRecommendations() {
  try {
    // 显示加载状态
    showLoading(true);
    hideCards();
    hideRecommendationText();
    
    // 调用API获取推荐
    const response = await fetch('/api/recommendations');
    
    if (!response.ok) {
      throw new Error('获取推荐失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      // 显示推荐语
      if (data.recommendationText) {
        showRecommendationText(data.recommendationText);
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
    getRecommendationBtn.textContent = '正在获取推荐...';
  } else {
    loadingElement.classList.add('hidden');
    getRecommendationBtn.disabled = false;
    getRecommendationBtn.textContent = '看看今天吃啥';
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
    <div class="food-card-header">
      <div class="food-emoji">${emoji}</div>
    </div>
    <div class="food-card-content">
      <h3 class="food-name">${escapeHtml(food.name)}</h3>
      <p class="food-description">${escapeHtml(food.description || '')}</p>
      <div class="like-section">
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-food-name="${escapeHtml(food.name)}">
          <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
          <span class="like-text">${isLiked ? '已点赞' : '点赞'}</span>
        </button>
        <span class="like-count" id="like-count-${encodeId(food.name)}">${isLiked ? '1' : '0'}</span>
      </div>
    </div>
  `;
  
  // 添加点赞按钮事件
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLike(food.name, likeBtn);
  });
  
  return card;
}

// 处理点赞
async function handleLike(foodName, likeBtn) {
  // 如果已经点赞，不重复处理
  if (likedFoods.has(foodName)) {
    showToast('您已经点赞过了哦');
    return;
  }
  
  try {
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
      
      // 更新按钮状态
      likeBtn.classList.add('liked');
      const likeIcon = likeBtn.querySelector('.like-icon');
      const likeText = likeBtn.querySelector('.like-text');
      likeIcon.textContent = '❤️';
      likeText.textContent = '已点赞';
      
      // 更新点赞数显示
      const likeCountEl = document.getElementById(`like-count-${encodeId(foodName)}`);
      if (likeCountEl) {
        likeCountEl.textContent = data.data.likeCount;
      }
      
      showToast(`已为「${foodName}」点赞！`);
    } else {
      throw new Error(data.message || '点赞失败');
    }
    
  } catch (error) {
    console.error('点赞失败:', error);
    showToast(error.message || '点赞失败，请稍后重试');
  }
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
  }, 2000);
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
