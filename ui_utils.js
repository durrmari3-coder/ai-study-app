/**
 * LUMINA UI UTILS
 * (Non-module script for early loading)
 */

window.toggleStudioTile = (contentId, forceShow) => {
    const content = document.getElementById(contentId);
    if (!content) return;
    
    const isHidden = content.style.display === 'none';
    const shouldShow = forceShow !== undefined ? forceShow : isHidden;
    
    content.style.display = shouldShow ? 'block' : 'none';
    
    // Toggle chevron
    const type = contentId.split('-')[0];
    const chevron = document.getElementById(`chevron-${type}`);
    if (chevron) {
        chevron.style.transform = shouldShow ? 'rotate(180deg)' : 'rotate(0deg)';
        chevron.style.transition = 'transform 0.3s ease';
    }
    
    console.log('Toggled Studio Tile:', contentId, shouldShow);
};
