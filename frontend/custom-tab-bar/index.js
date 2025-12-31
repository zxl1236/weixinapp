Component({
  data: {
    selected: 0,
    color: "#8B92A5",
    selectedColor: "#667EEA",
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/images/home.png",
        selectedIconPath: "/images/home-active.png"
      },
      {
        pagePath: "/pages/calendar/calendar",
        text: "日历", 
        iconPath: "/images/calendar.png",
        selectedIconPath: "/images/calendar-active.png"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        iconPath: "/images/profile.png",
        selectedIconPath: "/images/profile-active.png"
      }
    ]
  },
  
  attached() {
    // 获取当前页面路径并设置选中状态
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      const route = '/' + currentPage.route;
      const index = this.data.list.findIndex(item => item.pagePath === route);
      if (index !== -1) {
        this.setData({
          selected: index
        });
      }
    }
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      if (this.data.selected !== data.index) {
        wx.switchTab({
          url: url,
          success: () => {
            this.setData({
              selected: data.index
            });
          }
        });
      }
    }
  }
})
