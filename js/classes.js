/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * Classes & Category Menu Controller (Minimalist & Ergonomic 2026)
 */

const ClassesManager = {
  activeGrade: 'X',
  activeClassId: null,
  activeCategory: null,
  allClasses: [],
  settings: {},

  async renderStudentClassSelector(containerId, onSelectCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.allClasses = await window.DB.getClasses();
    this.settings = await window.DB.getSettings();
    this.onSelectCallback = onSelectCallback;

    // Default to first rombel in grade X
    const firstX = this.allClasses.find(c => c.grade === 'X');
    if (firstX && !this.activeClassId) {
      this.activeClassId = firstX.id;
    }

    this.renderMenuUI(container);

    if (window.ExamsManager && this.activeClassId) {
      ExamsManager.loadClassExams(this.activeClassId, null, null);
    }
  },

  renderMenuUI(container) {
    let specialTabs = '';
    if (this.settings.menu_susulan_enabled) {
      specialTabs += `
        <button class="btn btn-sm ${this.activeCategory === 'SUSULAN' ? 'btn-accent' : 'btn-secondary'}" onclick="ClassesManager.selectCategory('SUSULAN')">
          🔄 Ujian Susulan
        </button>
      `;
    }
    if (this.settings.menu_remedial_enabled) {
      specialTabs += `
        <button class="btn btn-sm ${this.activeCategory === 'REMEDIAL' ? 'btn-accent' : 'btn-secondary'}" onclick="ClassesManager.selectCategory('REMEDIAL')">
          📝 Remedial
        </button>
      `;
    }
    if (this.settings.menu_tryout_enabled) {
      specialTabs += `
        <button class="btn btn-sm ${this.activeCategory === 'TRYOUT' ? 'btn-accent' : 'btn-secondary'}" onclick="ClassesManager.selectCategory('TRYOUT')">
          🎯 Try Out
        </button>
      `;
    }
    if (this.settings.menu_khusus_enabled) {
      specialTabs += `
        <button class="btn btn-sm ${this.activeCategory === 'KHUSUS' ? 'btn-accent' : 'btn-secondary'}" onclick="ClassesManager.selectCategory('KHUSUS')">
          ⭐ Ujian Khusus
        </button>
      `;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.85rem; width: 100%;">
        
        <!-- Level 1: Grade & Special Category Tabs -->
        <div class="class-tabs-wrapper" style="gap: 0.5rem; background: var(--bg-surface); padding: 0.6rem; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xs);">
          <button class="btn btn-sm ${!this.activeCategory && this.activeGrade === 'X' ? 'btn-primary' : 'btn-secondary'}" onclick="ClassesManager.selectGrade('X')">
            🎓 Kelas X
          </button>
          <button class="btn btn-sm ${!this.activeCategory && this.activeGrade === 'XI' ? 'btn-primary' : 'btn-secondary'}" onclick="ClassesManager.selectGrade('XI')">
            🎓 Kelas XI
          </button>
          <button class="btn btn-sm ${!this.activeCategory && this.activeGrade === 'XII' ? 'btn-primary' : 'btn-secondary'}" onclick="ClassesManager.selectGrade('XII')">
            🎓 Kelas XII
          </button>
          ${specialTabs}
        </div>

        <!-- Level 2: Sub-Classes Rombel Pills -->
        <div id="subClassPillsContainer" class="class-tabs-wrapper" style="display: ${!this.activeCategory ? 'flex' : 'none'}; gap: 0.45rem; padding: 0.65rem 1rem; background: var(--bg-surface-muted); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); align-items: center;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary-800); margin-right: 0.35rem; flex-shrink: 0;">
            Rombel ${this.activeGrade}:
          </span>
          ${this.renderSubClassButtons()}
        </div>

      </div>
    `;
  },

  renderSubClassButtons() {
    if (this.activeCategory) return '';

    const gradeClasses = this.allClasses.filter(c => c.grade === this.activeGrade);
    if (!gradeClasses.length) {
      return `<span style="font-size: 0.8rem; color: var(--text-muted);">Belum ada rombel kelas ${this.activeGrade}.</span>`;
    }

    let html = '';
    gradeClasses.forEach(cls => {
      const isSelected = this.activeClassId === cls.id;
      html += `
        <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}" onclick="ClassesManager.selectSubClass('${cls.id}')" style="padding: 0.35rem 0.85rem; font-size: 0.825rem; font-weight: 700; flex-shrink: 0;">
          ${cls.name}
        </button>
      `;
    });

    return html;
  },

  selectGrade(grade) {
    this.activeGrade = grade;
    this.activeCategory = null;

    const gradeClasses = this.allClasses.filter(c => c.grade === grade);
    this.activeClassId = gradeClasses.length ? gradeClasses[0].id : null;

    const container = document.getElementById('classSelectorContainer');
    if (container) this.renderMenuUI(container);

    if (window.ExamsManager) {
      ExamsManager.loadClassExams(this.activeClassId, null, null);
    }
  },

  selectSubClass(classId) {
    this.activeClassId = classId;
    this.activeCategory = null;

    const container = document.getElementById('classSelectorContainer');
    if (container) this.renderMenuUI(container);

    if (window.ExamsManager) {
      ExamsManager.loadClassExams(classId, null, null);
    }
  },

  selectCategory(categoryKey) {
    this.activeCategory = categoryKey;
    this.activeClassId = null;

    const container = document.getElementById('classSelectorContainer');
    if (container) this.renderMenuUI(container);

    let typeFilter = 'Ujian Susulan';
    if (categoryKey === 'REMEDIAL') typeFilter = 'Remedial';
    else if (categoryKey === 'TRYOUT') typeFilter = 'Try Out';
    else if (categoryKey === 'KHUSUS') typeFilter = 'Khusus';

    if (window.ExamsManager) {
      ExamsManager.loadClassExams(null, null, typeFilter);
    }
  }
};

window.ClassesManager = ClassesManager;
