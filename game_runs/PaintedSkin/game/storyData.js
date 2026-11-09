window.HuaPi = window.HuaPi || {};
window.HuaPi.STORY = {
  "meta": {
    "title": "画皮",
    "source": "借用蒲松龄《聊斋志异·画皮》设定的原创改编",
    "version": "2.0.0",
    "vars": {
      "xin": {
        "label": "心",
        "init": 0,
        "min": 0,
        "max": 100,
        "show": "haze"
      },
      "dao": {
        "label": "道",
        "init": 0,
        "min": -1,
        "max": 3,
        "show": false
      }
    },
    "review": {
      "knowledge": [
        {
          "node": "f_secret",
          "wang": "只知女子是逃妾、梦呓出沈府与井；不知她是鬼，也未见过沈夫人",
          "chen": "察觉丈夫隐瞒，不知书斋女子是谁",
          "nv": "不知道王生准备去沈府打听"
        },
        {
          "node": "f_chen",
          "wang": "已去沈府打听，未见过陈氏提灯来书斋",
          "chen": "确信书斋有女子，但从未见过她",
          "nv": "仍在井边守遗骨，不知陈氏已发现画像"
        },
        {
          "node": "f_portrait",
          "wang": "尚不知道妻子来过",
          "chen": "以为榻上是一幅画，不知是人皮或女鬼",
          "nv": "不在书斋，仍不知道陈氏看见画像"
        },
        {
          "node": "f_burn",
          "wang": "不在现场，不知画像被烧",
          "chen": "以为烧掉情敌画像，不知她是鬼或与画像相连",
          "nv": "只感到画皮被焚灼，不知是谁动手"
        },
        {
          "node": "f_flee",
          "wang": "尚未赶到王家",
          "chen": "知道画上女子的脸出现了，但不知她是谁、为何而来",
          "nv": "知道正室毁了自己的皮，不知道王生去了沈府"
        },
        {
          "node": "f_shield",
          "wang": "只看见怪物扑向妻子，不知来由",
          "chen": "认出朱砂痣与画像，仍不知身世",
          "nv": "被怒火驱使，误把陈氏视作当年沈夫人"
        },
        {
          "node": "f_last",
          "wang": "认出梦盈；来不及解释自己去井边找过遗骨",
          "chen": "只知道丈夫为护自己而死",
          "nv": "凭井泥银簪明白王生替自己找过遗骨"
        },
        {
          "node": "f_truth",
          "wang": "已死，不知道完整真相",
          "chen": "知道梦盈身世及丈夫找遗骨的真相",
          "nv": "知道陈氏烧画时以为是画像，不知她身世"
        }
      ]
    }
  },
  "cast": {
    "wang": {
      "name": "王生",
      "height": 1,
      "states": {
        "calm": "平静",
        "worry": "忧心",
        "fear": "惊惧",
        "resolve": "坚定",
        "grief": "悲恸",
        "weak": "虚弱",
        "smitten": "心动"
      }
    },
    "chen": {
      "name": "陈氏",
      "height": 0.94,
      "states": {
        "calm": "端庄",
        "cold": "冷意",
        "worry": "担忧",
        "fear": "惊惧",
        "resolve": "坚定",
        "remorse": "悔恸"
      }
    },
    "nv": {
      "name": "女子",
      "rename": [
        {
          "flag": "alias_known",
          "name": "阿绢"
        },
        {
          "flag": "name_known",
          "name": "何梦盈"
        }
      ],
      "height": 0.92,
      "states": {
        "pitiful": "楚楚",
        "smile": "浅笑",
        "dressed": "梳妆后",
        "love": "含情"
      }
    },
    "gui": {
      "name": "鬼影",
      "height": 0.92,
      "states": {
        "rage": "怨怒",
        "sorrow": "哀恸",
        "calm": "安宁"
      }
    },
    "dao": {
      "name": "止水",
      "height": 1.02,
      "states": {
        "stern": "审视",
        "calm": "悲悯",
        "angry": "震怒",
        "act": "施法"
      }
    },
    "shen": {
      "name": "沈夫人",
      "height": 0.9,
      "states": {
        "haughty": "威严",
        "terror": "惊惧",
        "remorse": "悔恸"
      }
    }
  },
  "scenes": {
    "home_hall": {
      "name": "王家正堂",
      "tint": "#fff4ea"
    },
    "home_night": {
      "name": "王家夜堂",
      "tint": "#aab5ca"
    },
    "road_dawn": {
      "name": "晨雾官道",
      "tint": "#e7d5c8"
    },
    "study_in": {
      "name": "书斋",
      "tint": "#f1e7d7"
    },
    "study_night": {
      "name": "雨夜书斋",
      "tint": "#9ca7bd"
    },
    "market": {
      "name": "县城集市",
      "tint": "#e7c9a2"
    },
    "temple": {
      "name": "破观",
      "tint": "#b8aa97"
    },
    "bedroom_night": {
      "name": "内室夜色",
      "tint": "#9ba7bb"
    },
    "bedroom_dawn": {
      "name": "内室清晨",
      "tint": "#f1d9b4"
    },
    "shen_inner": {
      "name": "沈府内宅",
      "tint": "#9b7563"
    },
    "shen_well": {
      "name": "沈府枯井",
      "tint": "#55566b"
    },
    "grave_dawn": {
      "name": "山坡新冢",
      "tint": "#e2c6a5"
    },
    "courtyard_night": {
      "name": "王家月院",
      "tint": "#85899d"
    }
  },
  "cgs": {
    "cover": {
      "name": "未竟的画卷"
    },
    "window_peek": {
      "name": "窗纸之后"
    },
    "portrait": {
      "name": "榻上美人图"
    },
    "burning": {
      "name": "火盆中的画"
    },
    "study_fire": {
      "name": "书斋火起"
    },
    "shield_shadow": {
      "name": "墙上的三道影"
    },
    "aftermath": {
      "name": "银簪与月色"
    },
    "heart_wang": {
      "name": "渡命"
    },
    "heart_chen": {
      "name": "还心"
    },
    "well_bones": {
      "name": "井底遗骨"
    },
    "fade": {
      "name": "褪色的绢"
    }
  },
  "achievements": {
    "ach_painted": {
      "title": "画皮",
      "description": "你终于看见她不愿示人的一面。"
    },
    "ach_misunderstood": {
      "title": "误",
      "description": "一场没有人看全的误会，留下了血色回声。"
    },
    "ach_truth": {
      "title": "真名",
      "description": "她说出了何梦盈，也说出了自己的冤屈。"
    },
    "ach_e1": {
      "title": "公道",
      "description": "冤屈得雪，遗骨有归。"
    },
    "ach_e2": {
      "title": "未度",
      "description": "公道迟来，渡引未至。"
    },
    "ach_e3": {
      "title": "血债",
      "description": "仇恨偿还了仇恨。"
    },
    "ach_e4": {
      "title": "同心",
      "description": "她把最后一缕温热留给了她们。"
    },
    "ach_e5": {
      "title": "黄泉",
      "description": "有些迟来的明白，赶不上第七日。"
    },
    "ach_e6": {
      "title": "自卫",
      "description": "火里没有胜者。"
    },
    "ach_e7": {
      "title": "焚屋",
      "description": "灰烬之外，旧戒仍在。"
    },
    "ach_e8": {
      "title": "替身",
      "description": "她带着一颗甘愿相予的心，走向来世。"
    }
  },
  "startNodeId": "a1_letter",
  "nodes": {
    "a1_letter": {
      "card": "第一幕 · 遇",
      "pov": "wang",
      "scene": "home_hall",
      "segments": [
        {
          "text": "母亲的信搁在茶盏旁。墨迹很重，像把一句话写了许多遍：陈氏无出，宜早纳妾。",
          "stage": {
            "clear": true,
            "L": "wang:calm",
            "R": "chen:calm"
          }
        },
        {
          "text": "你尚未收起信，陈氏已瞥见那行字。她神色一冷，转身却把刚蒸好的饼包给门外的老妇。"
        },
        {
          "text": "你知道她怕的并非多一个人吃饭。多年无子，在这个家里，她随时可能被一句旧礼法赶出门。"
        },
        {
          "text": "她心软，也会妒。你想护住她，却不知沉默与坦白，哪一种更像体恤。"
        },
        {
          "text": "堂屋里蒸汽渐薄，陈氏替老妇系紧包袱。你忽然觉得，信里的规矩从未替任何人问过冷暖。"
        }
      ],
      "choices": [
        {
          "text": "当她面烧信，免她忧惧",
          "next": "a1_road",
          "changes": {
            "addFlag": "letter_burned"
          }
        },
        {
          "text": "收起信，怕她更难过",
          "next": "a1_road",
          "changes": {
            "addFlag": "letter_kept"
          }
        }
      ]
    },
    "a1_road": {
      "scene": "road_dawn",
      "segments": [
        {
          "text": "太原城外，秋雾尚未散尽。一个女子抱着小小的包袱独行，步子被露水和疲惫拖得很慢。",
          "stage": {
            "clear": true,
            "L": "wang:calm",
            "R": "nv:pitiful"
          }
        },
        {
          "speaker": "wang",
          "text": "何夙夜踽踽独行？"
        },
        {
          "speaker": "nv",
          "text": "父母贪赂，鬻妾朱门。嫡母妒我，朝詈夕辱；我受不住，想趁夜远遁。"
        },
        {
          "text": "她说得平静，眼神却在你胸前停了一瞬。那目光不像求助，更像是在量一件尚未决定用途的东西。"
        },
        {
          "text": "雾散了一些，远处村舍露出灰瓦。她走得很慢，却不肯让你扶，像早已习惯把疼痛藏进袖中。"
        },
        {
          "text": "她说话时总把「妾」字说得很轻，仿佛只要声音小些，那个身份就不会跟着她走。"
        }
      ],
      "choices": [
        {
          "text": "带她去书斋暂避，另寻去处",
          "next": "a1_study"
        },
        {
          "text": "送她去尼庵，不留作外室",
          "next": "a1_study",
          "changes": {
            "add": {
              "xin": -10
            }
          }
        }
      ]
    },
    "a1_study": {
      "scene": "study_in",
      "onEnter": {
        "addFlag": "alias_known"
      },
      "segments": [
        {
          "text": "你替她提过包袱，送到书斋门前。她先看了看院中，确认没有旁人，才肯跨进门槛。",
          "stage": {
            "clear": true,
            "L": "wang:calm",
            "R": "nv:smile"
          }
        },
        {
          "speaker": "nv",
          "text": "君何无家口？"
        },
        {
          "speaker": "wang",
          "text": "斋耳。"
        },
        {
          "speaker": "nv",
          "text": "如怜妾而活之，须秘密，勿泄。"
        },
        {
          "text": "你答应保守秘密。问她姓名，她沉默片刻，只说：「叫我阿绢吧。」那一停顿，像将另一个名字咽回了喉间。"
        },
        {
          "text": "书斋里有纸墨香，她坐得离门很近。你以为那是怕打扰，后来才明白，她一直在替自己留退路。"
        }
      ],
      "next": "a1_dress"
    },
    "a1_dress": {
      "scene": "study_in",
      "segments": [
        {
          "text": "次日清晨，你推门送水。她正对一面小镜梳妆，窗纸透进薄光，映得她鬓边的银簪像一线霜。",
          "stage": {
            "clear": true,
            "L": null,
            "R": "nv:dressed"
          }
        },
        {
          "text": "她回眸一笑，美得仿佛连尘埃都不忍落在她身上。那颗左眼下的朱砂痣，却有种不合时宜的熟悉。"
        },
        {
          "text": "她新描的眉眼与记忆里相同。镜中却映不出她昨夜离屋时，那一身青绿的影子。"
        },
        {
          "text": "她抬手簪花时，镜面映出一道浅浅的裂纹。她没有回头，只用指腹轻轻压住了那块碎银。"
        }
      ],
      "choices": [
        {
          "text": "移开目光，问她缺什么",
          "next": "a1_rain"
        },
        {
          "text": "一时看痴，忘了开口",
          "next": "a1_rain",
          "changes": {
            "add": {
              "xin": 20
            }
          }
        }
      ]
    },
    "a1_rain": {
      "scene": "study_night",
      "segments": [
        {
          "text": "几日后下起夜雨。你借口送灯油，走到书斋时，发现她方才从井边回来，袖口湿冷。",
          "stage": {
            "clear": true,
            "L": null,
            "C": "nv:love",
            "R": null
          }
        },
        {
          "text": "她说每夜子时都要去一处旧井旁，像在等谁。又说肌肤相亲会让这张画皮褪得更快。"
        },
        {
          "speaker": "nv",
          "text": "雨大，郎君今夜可留下？"
        },
        {
          "text": "她眼中有盼望，也有惧怕。你想起家中那盏等你回去的灯，听见雨声把两处屋檐连在一起。"
        },
        {
          "text": "灯油在你手中晃出一点暖色。她望着火苗，像望着一件能留下、却不敢伸手去拿的东西。"
        }
      ],
      "choices": [
        {
          "text": "回去陪等候的妻子",
          "next": "a1_home",
          "changes": {
            "add": {
              "xin": -10
            }
          }
        },
        {
          "text": "留下陪她听雨",
          "next": "a1_home",
          "changes": {
            "add": {
              "xin": 20
            }
          }
        }
      ]
    },
    "a1_home": {
      "scene": "home_night",
      "segments": [
        {
          "text": "你回到家时，陈氏仍坐在堂中。她闻到你袖上的脂粉香，手指轻轻停在未做完的针线上。",
          "stage": {
            "clear": true,
            "L": "wang:worry",
            "C": null,
            "R": "chen:cold"
          }
        },
        {
          "speaker": "chen",
          "text": "书斋里，有什么？"
        },
        {
          "text": "她没有高声逼问。她怕自己一旦问得太多，你就会觉得她不值得被信任。"
        },
        {
          "text": "若你收过母亲的信，她还从袖袋里摸到了那张纸。此刻要说出口的，究竟是实情，还是你想保住的体面？"
        },
        {
          "text": "你听见她把针穿过布面，细细一声，像有人想缝住一句已经到了嘴边的话。"
        },
        {
          "text": "你想起自己曾答应过母亲，也答应过妻子。两份承诺没有冲突，冲突的是你不愿承担的后果。"
        }
      ],
      "choices": [
        {
          "text": "坦白，愿一起面对",
          "next": "a1_market",
          "changes": {
            "set": {
              "xin": 0
            },
            "addFlag": "told"
          }
        },
        {
          "text": "隐瞒，怕她因此误会",
          "next": "a1_market",
          "changes": {
            "addFlag": "hid_fear"
          }
        },
        {
          "text": "隐瞒，只想独占她",
          "if": "xin >= 30",
          "next": "a1_market",
          "changes": {
            "addFlag": "hid_lust"
          }
        }
      ]
    },
    "a1_market": {
      "scene": "market",
      "segments": [
        {
          "text": "次日集市上，道士拦住你。他的拂塵垂在臂弯，像一截被风吹不动的白水。",
          "stage": {
            "clear": true,
            "L": "wang:calm",
            "C": null,
            "R": "dao:stern"
          }
        },
        {
          "speaker": "dao",
          "text": "君身邪气萦绕。此物亦良苦，甫能觅代者，我不忍伤她。"
        },
        {
          "text": "他自称止水，只说道术可以渡人、护人，不能替谁决定生死；曾经插手一次，救了一人，却累及一村。"
        },
        {
          "text": "他把拂尘交给你，叫你挂在家门。你没来由地觉得，那不像降妖的法器，倒像一个人迟迟不肯伸出的手。"
        },
        {
          "text": "集市人声渐远，止水收回手，仿佛把一场尚未发生的灾祸也一并收进袖中。"
        },
        {
          "text": "街上有人讨价还价，也有人替孩子系鞋带。止水说，因果从来不只发生在深夜和鬼影里。"
        }
      ],
      "choices": [
        {
          "text": "请他指路，愿听清来由",
          "next": "a1_routes",
          "changes": {
            "add": {
              "dao": 1
            }
          }
        },
        {
          "text": "不信术士，不受他教训",
          "next": "a1_routes",
          "changes": {
            "add": {
              "dao": -1
            },
            "addFlag": "dao_scorned"
          }
        }
      ]
    },
    "a1_routes": {
      "routes": [
        {
          "if": "hasFlag 'told'",
          "next": "h_wife"
        },
        {
          "if": "hasFlag 'hid_fear'",
          "next": "f_secret"
        },
        {
          "if": "default",
          "next": "l_keep"
        }
      ]
    },
    "h_wife": {
      "scene": "home_hall",
      "card": "第二幕 · 皮",
      "segments": [
        {
          "text": "陈氏静静听完。嫉意只在她眼底闪了一下，随即被另一种更深的担心盖住。",
          "stage": {
            "clear": true,
            "L": "wang:calm",
            "C": null,
            "R": "chen:worry"
          }
        },
        {
          "speaker": "chen",
          "text": "又是一个逃妾。明日我同你去看她。"
        },
        {
          "text": "她没有说原谅，也没有说不在乎。你看见她把桌上的信折好，压在一只空茶盏下。"
        },
        {
          "text": "她一夜没有睡好，晨起时仍替你理平衣襟。温柔没有消去戒备，只让戒备不再伤人。"
        }
      ],
      "next": "h_meet"
    },
    "h_meet": {
      "scene": "study_in",
      "segments": [
        {
          "text": "两个女人第一次相见。阿绢不肯抬眼，陈氏先看见她腕上几道旧痕，颜色已经被她照着记忆画进皮相。",
          "stage": {
            "clear": true,
            "L": "chen:calm",
            "C": null,
            "R": "nv:pitiful"
          }
        },
        {
          "speaker": "chen",
          "text": "天冷，这件夹袄你拿去。若要走，我替你寻个妥当去处。"
        },
        {
          "text": "陈氏说话时，手一直按着自己袖口。她看见一个无处可去的年轻女子，也看见自己曾经最怕成为的样子。"
        },
        {
          "text": "阿绢接过衣裳，没有道谢，只问她为何肯信一个陌生人。陈氏答不出来，便替她把衣领拢好。"
        },
        {
          "text": "阿绢把夹袄叠在膝头，指尖摸过针脚。有人第一次把衣裳递给她，不是为了叫她偿还什么。"
        }
      ],
      "next": "h_peek"
    },
    "h_peek": {
      "scene": "study_night",
      "cg": "window_peek",
      "onEnter": {
        "unlockAchievement": "ach_painted"
      },
      "segments": [
        {
          "text": "子夜，你替妻子送夹袄到书斋。窗纸破了一线，屋里的人影伏在榻边，正为一张绢补色。",
          "stage": {
            "clear": true,
            "L": "wang:fear",
            "C": null,
            "R": null
          }
        },
        {
          "text": "那影子青面乱发，手里的彩笔沿着女子的眼角一遍遍描过。榻上的人皮平展如画，安静得像还在呼吸。"
        },
        {
          "text": "你认出那张脸，也认出左眼下的朱砂痣。你不知自己是在怕她，还是怕自己曾经愿意相信的那层皮。"
        },
        {
          "text": "夹袄从你手中滑落，落在湿石阶上。屋内那支笔仍在移动，每一笔都像把谎言描得更真。"
        }
      ],
      "choices": [
        {
          "text": "逃回家，先护住妻子",
          "next": "h_flee"
        },
        {
          "text": "站在窗外，唤她说真话",
          "next": "h_truth"
        }
      ]
    },
    "h_flee": {
      "scene": "bedroom_night",
      "segments": [
        {
          "text": "你一路跑回家，手里还攥着那件夹袄。陈氏没有追问，只先替你关上门。",
          "stage": {
            "clear": true,
            "L": "wang:fear",
            "C": null,
            "R": "chen:fear"
          }
        },
        {
          "speaker": "chen",
          "text": "她若真要害你，早有机会。我们一起去问个明白。"
        },
        {
          "text": "她说得很稳，握住你的手却发着凉。你们要面对的不是一桩艳遇，而是一个还没来得及被听见的人。"
        },
        {
          "text": "陈氏替你擦去额角的雨水，没有追问你为什么怕。你第一次觉得，求助也可以不以羞耻为代价。"
        }
      ],
      "onEnter": {
        "addFlag": "fled"
      },
      "next": "h_truth"
    },
    "h_truth": {
      "scene": "study_night",
      "onEnter": {
        "addFlag": "name_known",
        "unlockAchievement": "ach_truth"
      },
      "segments": [
        {
          "text": "她没有再披那张美人的脸。青绿的面色和旧衣上的水痕，使你想起她每夜去守的那口井。",
          "stage": {
            "clear": true,
            "L": "wang:fear",
            "C": null,
            "R": "gui:sorrow"
          }
        },
        {
          "speaker": "gui",
          "text": "我叫何梦盈。阿绢只是我在路上借的名字。"
        },
        {
          "text": "她说父母收钱，把她卖进沈府。沈夫人没有孩子，怕她生下的孩子夺去正室的位置，折磨她后把她推入后院井中。"
        },
        {
          "text": "她起初确实想取你的心。可你守住了分寸，她便不愿再把另一个无辜的人拖进自己的冤屈。"
        },
        {
          "text": "遗骨还在井底，沈夫人夜夜被旧事惊醒。她只求公道和一抔土；念珠与佛龛护着沈夫人，她自己近不得身。"
        },
        {
          "text": "说完以后，她低头看着自己画出的双手。那不是她生前的手，却是她唯一还认得的模样。"
        },
        {
          "text": "这张画皮是她凭记忆画下的生前模样；颜色日日褪去，每夜子时须揭下补画。"
        },
        {
          "text": "补画之前，她要到井边守着自己的遗骨。若皮被毁，她也会失去记得自己曾是人的凭据。"
        },
        {
          "text": "冤魂不能自行投生：须冤屈得雪、遗骨入土再经超度，或觅得一颗甘愿相予的心。"
        },
        {
          "text": "强取的心只会让她成为厉鬼；只有甘愿给出的心，才能续命或助人转生。"
        }
      ],
      "next": "h_help"
    },
    "h_help": {
      "scene": "home_hall",
      "segments": [
        {
          "text": "回家后，你们没有彼此责备。陈氏将夹袄重新叠好，说她可以以女眷身份进沈府。",
          "stage": {
            "clear": true,
            "L": "wang:resolve",
            "C": null,
            "R": "chen:resolve"
          }
        },
        {
          "speaker": "chen",
          "text": "她怕的是另一个像她的人。我去问那口井，也去问沈夫人。"
        },
        {
          "text": "你去找止水，请他护住路上的人。陈氏把拂尘放在桌上，白色的尾丝沾着一滴灯油。"
        },
        {
          "text": "你们分头出门。没人能替梦盈作主，但至少可以把井边那段无人敢说的旧事带到光下。"
        },
        {
          "text": "分工不是把危险推给对方。你们只是各自走到自己还能承担的位置，再约好回来相见。"
        },
        {
          "text": "陈氏先把那封信放回抽屉。她说不想再让母亲的催促替她决定该怎样看待另一个女人。"
        }
      ],
      "next": "h_dao"
    },
    "h_dao": {
      "scene": "temple",
      "segments": [
        {
          "text": "破观里只有一盏残灯。止水听完，久久没有答话。他说二十年前曾为一人改命，后来那人活了，整村却遭了灾。",
          "stage": {
            "clear": true,
            "L": null,
            "C": null,
            "R": "dao:stern"
          }
        },
        {
          "text": "自那以后，他只渡甘愿交出的东西，只护尸身与一缕魂魄；从不凭空复生，也不拿一人去换另一人。"
        },
        {
          "text": "他拒绝替你们判决沈夫人。你听得出，他不是不怜悯，只是不肯再把悲悯误当成有权替人选择。"
        },
        {
          "text": "若他先前听过你的讥讽，他只淡淡补了一句：求道的人总要先学会，别把戒心当本事。"
        },
        {
          "text": "破观檐下积着雨水。止水说，沉默也会伤人，但贸然替别人决定，伤得往往更深。"
        },
        {
          "text": "止水把旧事说完，闭上眼睛。那不是求你原谅他，只是让你知道他的克制也曾有代价。"
        }
      ],
      "choices": [
        {
          "text": "为她的冤长跪不起",
          "next": "h_shen",
          "changes": {
            "add": {
              "dao": 1
            }
          }
        },
        {
          "text": "自己去问，不再求他",
          "next": "h_shen"
        }
      ]
    },
    "h_shen": {
      "pov": "chen",
      "scene": "shen_inner",
      "card": "此刻，你是陈氏",
      "segments": [
        {
          "text": "沈府内宅深得像没有白日。沈夫人手捻念珠，佛龛前的香灰落满了供桌。",
          "stage": {
            "clear": true,
            "L": "chen:calm",
            "C": null,
            "R": "shen:haughty"
          }
        },
        {
          "speaker": "chen",
          "text": "我想问问后院那口井。"
        },
        {
          "text": "听见井字，沈夫人手里的珠子乱了一颗。她先问你从何处听来，又说当年不过是个逃走的妾。"
        },
        {
          "text": "她老了，仍无子，夜里常梦见井水漫过门槛。你在她惊惧的脸上看见自己：若再往前一步，你也可能学会用恐惧伤人。"
        },
        {
          "text": "你的茶没有喝。沈夫人的念珠一颗颗擦亮，佛龛前却有一处供香从未燃尽。"
        }
      ],
      "next": "h_well"
    },
    "h_well": {
      "pov": "wang",
      "scene": "shen_well",
      "cg": "well_bones",
      "segments": [
        {
          "text": "夜色里，你和陈氏带着沈夫人走到井边。止水只在远处守着，没有替任何人决定该说什么。",
          "stage": {
            "clear": true,
            "L": "wang:resolve",
            "C": "shen:terror",
            "R": "gui:rage"
          }
        },
        {
          "text": "井盖被掀开，泥里露出一束腐朽的莲粉绸。那不是证词，却让沈夫人再也无法把旧事说成一场梦。"
        },
        {
          "speaker": "shen",
          "text": "我老了，念了这些年经，怎么还逃不出这一口井？"
        },
        {
          "text": "梦盈没有催促她。她的鬼影立在井旁，像等一个答案，也像在等自己终于可以不再等待。"
        },
        {
          "speaker": "shen",
          "text": "你说，我该怎么做？"
        },
        {
          "text": "井沿有她当年抓过的痕迹，泥土却早被岁月磨平。梦盈伸手又收回，仿佛不敢确认那真是自己的旧事。"
        }
      ],
      "choices": [
        {
          "text": "让她公堂认罪，遗骨归土",
          "next": "h_justice",
          "changes": {
            "addFlag": "justice"
          }
        },
        {
          "text": "她欠你的，讓她偿命",
          "next": "h_blood",
          "changes": {
            "addFlag": "blood"
          }
        }
      ]
    },
    "h_justice": {
      "scene": "grave_dawn",
      "segments": [
        {
          "text": "沈夫人当众认下旧罪。她没有为自己求情，只请人把井底遗骨收殓，葬在山坡向阳处。",
          "stage": {
            "clear": true,
            "L": null,
            "C": null,
            "R": "nv:smile"
          }
        },
        {
          "text": "梦盈站在新土旁，水痕从衣袖褪去。她终于不再守着一口井，也终于知道自己死前曾经是谁。"
        },
        {
          "text": "止水望着她，手指在拂尘上停了很久。你第一次看见他把那条旧戒放在怜悯之后。"
        },
        {
          "text": "公堂散去后，没有人欢呼。陈氏给沈夫人递了一碗水，仇恨没有因此消失，只终于不再独占真相。"
        }
      ],
      "routes": [
        {
          "if": "dao >= 2",
          "next": "e1"
        },
        {
          "if": "default",
          "next": "e2"
        }
      ]
    },
    "h_blood": {
      "scene": "shen_well",
      "segments": [
        {
          "text": "井边响起一声短促的呼喊，随即只剩风吹枯叶。梦盈亲手了结了沈夫人。",
          "stage": {
            "clear": true,
            "L": null,
            "C": null,
            "R": "gui:rage"
          }
        },
        {
          "text": "她的怨意似乎落了地，魂魄却被那一条性命染上了血。她不能投生，也再不能把一颗心交给别人。"
        },
        {
          "text": "止水被激怒，终于出手降服她。他没有说这是正义，只把她的魂护在一线将断未断的水光里。"
        },
        {
          "text": "沈夫人倒下前，念珠滚入井边泥里。梦盈望着那串断开的珠子，像看见一段仍无法重来的年月。"
        }
      ],
      "next": "e3"
    },
    "f_secret": {
      "scene": "study_in",
      "pov": "wang",
      "card": "第二幕 · 皮",
      "segments": [
        {
          "text": "你没有告诉陈氏。阿绢午睡时梦呓出「沈府」和「井」，你只当那是旧主留下的伤心处。",
          "stage": {
            "clear": true,
            "L": "wang:calm",
            "C": null,
            "R": "nv:smile"
          }
        },
        {
          "text": "你不知她是鬼，也没见过沈夫人。你只想查清那两句话，等弄明白以后，再给妻子一个惊喜。"
        },
        {
          "text": "她醒来时神色倦怠，说昨夜又去了井边。她没有告诉你那下面埋着什么，只说那里是她唯一记得的故乡。"
        },
        {
          "text": "你趁陈氏熟睡出门打听。书斋留着一盏灯，像替两种互不相知的担心照路。"
        },
        {
          "text": "你在街上问了几户人家，得到的只有沈府旧井多年封闭的传言。没人知道你为何问，也没人问你。"
        },
        {
          "text": "你把沈府的位置记在纸上，却没有写下梦盈的名字。那时你还不知道自己正在寻找一段命案。"
        }
      ],
      "next": "f_chen"
    },
    "f_chen": {
      "pov": "chen",
      "scene": "home_night",
      "segments": [
        {
          "text": "又一夜，王生没有归家。脂粉香、晚归、含糊的解释，一样样压在你胸口。",
          "stage": {
            "clear": true,
            "L": null,
            "C": "chen:cold",
            "R": null
          }
        },
        {
          "text": "若那封催纳妾的信还在，你也摸到了它。你忽然懂得，自己害怕的不是一个女子，是整套随时能把你换下来的规矩。"
        },
        {
          "text": "你没有见过她，也不知道她姓甚名谁。你提起灯，走向书斋，只想亲眼看一看丈夫藏起来的东西。"
        },
        {
          "text": "一路上你想过责问，也想过装作不知。灯芯很短，照不见你心里那道不肯承认的嫉意。"
        },
        {
          "text": "你把灯举高一些，墙上的影子就变得清楚。你仍看不见丈夫心里的答案，只看见自己不愿再等。"
        }
      ],
      "next": "f_portrait"
    },
    "f_portrait": {
      "scene": "study_night",
      "cg": "portrait",
      "segments": [
        {
          "text": "书斋空无一人。榻上铺着一幅等身美人图，绢色柔软，眉目栩栩如生，仿佛下一刻就会睁眼。",
          "stage": {
            "clear": true,
            "L": "chen:cold",
            "C": null,
            "R": null
          }
        },
        {
          "text": "你以为那只是一幅画。你不知道它是一张人皮，更不知道画上女子此刻正守在沈府的井边。"
        },
        {
          "text": "你心想，他竟把她画得这样好，留在书斋里日夜看着。那颗朱砂痣像一句没有说出口的挑衅。"
        },
        {
          "text": "你可以烧掉它，也可以留下来等他解释。你甚至可以暂且放回原处，先看清自己究竟在怕什么。"
        },
        {
          "text": "绢面没有落款，也没有印记。那张脸太像活人，反倒让你觉得它是王生自己画出来的。"
        }
      ],
      "choices": [
        {
          "text": "烧画像，断他的念想",
          "next": "f_burn"
        },
        {
          "text": "收好画像，等他解释",
          "next": "f_confront"
        },
        {
          "text": "放回原处，暂不惊动",
          "next": "f_replace"
        }
      ]
    },
    "f_confront": {
      "scene": "study_night",
      "segments": [
        {
          "text": "王生回来时，你把画卷摆在桌上。他摸到绢面，手一下缩回去：那柔软不像画布，更像温热的皮肤。",
          "stage": {
            "clear": true,
            "L": "chen:resolve",
            "C": null,
            "R": "wang:fear"
          }
        },
        {
          "speaker": "wang",
          "text": "我该早些告诉你。她不是我画的，我也不知这幅画从何而来。"
        },
        {
          "text": "他把自己知道的一切告诉了你。你们仍不知道那女子是鬼，只知道眼前的东西不该用一把火就了结。"
        },
        {
          "text": "你们决定等她回来。不是信任她，而是不愿让猜疑替另一个人定罪。"
        },
        {
          "text": "你把手从画卷上移开，王生没有阻拦。两个人之间第一次留下的不是秘密，而是一段难堪的坦白。"
        }
      ],
      "onEnter": {
        "addFlag": "told"
      },
      "next": "h_truth"
    },
    "f_replace": {
      "scene": "home_hall",
      "segments": [
        {
          "text": "你把那幅画放回原处，整夜没有合眼。次日，女子看着窗纸上的新裂口，说昨夜有人来过。",
          "stage": {
            "clear": true,
            "L": "chen:cold",
            "C": null,
            "R": "wang:worry"
          }
        },
        {
          "text": "王生听见这句话，脸色慢慢变了。他终于向你坦白书斋里住过谁，也承认自己怕你受伤才隐瞒。"
        },
        {
          "text": "你没有立刻原谅他。只是想起那双旧伤的手，觉得先去见见她，也许比先把彼此判成坏人更好。"
        },
        {
          "text": "你把画像的边角抚平，像替一个尚未见过的人遮住风。这个动作令你自己也有些意外。"
        }
      ],
      "onEnter": {
        "addFlag": "told"
      },
      "next": "h_meet"
    },
    "f_burn": {
      "scene": "study_night",
      "cg": "burning",
      "segments": [
        {
          "text": "你把画投进火盆。绢面卷曲、发黑，焦味里像夹着一缕烧焦的头发。",
          "stage": {
            "clear": true,
            "L": "chen:cold",
            "C": null,
            "R": null
          }
        },
        {
          "text": "你以为烧掉的是丈夫藏着的画像。你不知道沈府井旁的女子此刻也像被火灼，仿佛有人隔着夜色揭走她的脸。"
        },
        {
          "text": "火光照在你的手背上，你忽然听见窗外有急促的脚步。那不是画像在求救，是一个人正被逼回自己的仇恨里。"
        },
        {
          "text": "火盆旁没有留下灰烬以外的证据。你只闻见焦味，暂时不知道那味道为何会让人心惊。"
        }
      ],
      "next": "f_flee"
    },
    "f_flee": {
      "pov": "chen",
      "scene": "courtyard_night",
      "segments": [
        {
          "text": "同一刻，沈府井边的梦盈浑身如遭火灼。画皮是她凭记忆画下的生前模样，与她相连，焚毁便如剥去她记得自己是人的凭据。",
          "stage": {
            "clear": true,
            "L": "chen:fear",
            "C": null,
            "R": "gui:rage"
          }
        },
        {
          "text": "她赶回王家时，陈氏刚从书斋出来。一个失去皮相的女人从暗处扑来，满身怨火。"
        },
        {
          "speaker": "gui",
          "text": "你烧了我的脸……你和她一样！"
        },
        {
          "text": "陈氏在她左眼下看见那颗朱砂痣，认出了画上的脸，却不知道她是谁，也不知道这场怒火从何而来。"
        },
        {
          "text": "你听见自己的呼吸越来越急，仍把步子放慢。眼前的女人可怕，却也像在替谁重演一场旧罪。"
        }
      ],
      "next": "f_shield"
    },
    "f_shield": {
      "pov": "chen",
      "scene": "courtyard_night",
      "cg": "shield_shadow",
      "segments": [
        {
          "text": "王生从沈府回来，只比陈氏晚一步。他只看见一个怪物扑向妻子，不知道她为何而来。",
          "stage": {
            "clear": true,
            "L": null,
            "C": null,
            "R": null
          }
        },
        {
          "text": "他没有拔剑，也没有看清那张脸，只把双臂张开，挡在陈氏身前。"
        },
        {
          "text": "灯影把三个人的身形投在墙上。一个护住妻子，一个举手扑来，一个还在奔跑，谁也没能看见全貌。"
        },
        {
          "text": "刀光和喊声都没有出现。只有脚步声忽然停下，随后是一片让人不敢开口的静。"
        }
      ],
      "onEnter": {
        "unlockAchievement": "ach_misunderstood"
      },
      "next": "f_last"
    },
    "f_last": {
      "pov": "chen",
      "scene": "courtyard_night",
      "cg": "aftermath",
      "segments": [
        {
          "text": "王生倒在你膝上。月光照见她左眼下的朱砂痣，他认出了她，只望了她一眼，没有怨。",
          "stage": {
            "clear": true,
            "L": "chen:remorse",
            "C": null,
            "R": "gui:rage"
          }
        },
        {
          "speaker": "wang",
          "text": "你还是像我们初见时那样美……以后，一定要好好活下去。"
        },
        {
          "text": "他抚过你的鬓发，手慢慢垂下。你没有听见责怪，只听见夜风吹过门上那柄白拂尘。"
        },
        {
          "text": "袖中滑出一支沾着井泥的银簪。梦盈认出那是自己的旧物，怨意忽然断了，像一根绷紧多年的线终于松开。"
        },
        {
          "text": "银簪上沾着井泥，也沾着他未能说出的心意。月光很淡，却足够照见三个人各自失去的东西。"
        }
      ],
      "next": "f_truth"
    },
    "f_truth": {
      "pov": "chen",
      "scene": "courtyard_night",
      "card": "第三幕 · 心",
      "segments": [
        {
          "text": "止水赶到时，先看见陈氏膝上的人，又看见那支银簪。他解开的不是一个妖物的法术，而是两个女人之间的误会。",
          "stage": {
            "clear": true,
            "L": "chen:remorse",
            "C": "gui:sorrow",
            "R": "dao:angry"
          }
        },
        {
          "speaker": "dao",
          "text": "她不是来夺你丈夫的妖物。她是被沈夫人害死的妾；王生去井边，是替她找遗骨。"
        },
        {
          "text": "他又对梦盈说，陈氏烧的是一幅以为属于情敌的画像，并不知道那是一张脸，更不知道她当年受过什么。"
        },
        {
          "text": "没有人因此无辜，也没有人全然可恨。你们知道了真相，却不能把方才发生的事收回去。"
        },
        {
          "text": "陈氏低头看着掌心的灰。她不知道该向谁道歉，只知道从今往后不能再把猜想当作判词。"
        },
        {
          "text": "止水没有替谁求宽恕。他只把三个人各自看见的一小段真相，放到同一盏灯下。"
        }
      ],
      "next": "f_xunqing"
    },
    "f_xunqing": {
      "pov": "chen",
      "scene": "courtyard_night",
      "segments": [
        {
          "text": "你轻轻理好他的鬓发。那些年说过的话、没说出口的话，此刻都挤在胸口，最后只剩一声叹息。",
          "stage": {
            "clear": true,
            "L": "chen:remorse",
            "C": "gui:sorrow",
            "R": "dao:calm"
          }
        },
        {
          "speaker": "chen",
          "text": "你说我还像初见时那样美……可那时候，我眼里也只有你。"
        },
        {
          "text": "止水转身去看梦盈。灯火骤然暗下，夜色留出一块无人敢填的空白。没有人说出她如何离去。"
        },
        {
          "text": "等道士回身时，你尚存一口气。他跪在你身旁，没有碰你，只问这口气是否愿意交给他。"
        },
        {
          "speaker": "chen",
          "text": "……给他。"
        },
        {
          "text": "屋檐下的灯火忽明忽暗。止水听见她最后的话，终于没有再把悲悯藏进戒律之后。"
        }
      ],
      "next": "f_seal"
    },
    "f_seal": {
      "scene": "courtyard_night",
      "cg": "heart_wang",
      "segments": [
        {
          "text": "止水以术把陈氏甘愿交出的命火渡入王生胸中。她没有替他决定，也没有从梦盈身上夺走什么。",
          "stage": {
            "clear": true,
            "L": null,
            "C": null,
            "R": "dao:act"
          }
        },
        {
          "text": "随后他护住陈氏的尸身与一缕魂魄，只留下一句：「七日。我只能护她七日。」"
        },
        {
          "text": "梦盈站在远处，一言不发。那夜她私下跪求道士护住陈氏，愿在冤屈得雪后以自己的魂相换。"
        },
        {
          "text": "止水被她那句「他们两个，本该好好过日子」打动。他没有承诺复生，只答应守住一段尚未结束的缘分。"
        },
        {
          "text": "符纸无风自落，又被止水一张张拾起。护住一缕魂不等于让她回来，只是让离别暂缓。"
        }
      ],
      "next": "f_wake"
    },
    "f_wake": {
      "pov": "wang",
      "scene": "bedroom_night",
      "segments": [
        {
          "text": "你醒来时，胸中有一缕不属于自己的温热。道士告诉你，陈氏为你殉情，也告诉你他只能护她七日。",
          "stage": {
            "clear": true,
            "L": "wang:weak",
            "C": null,
            "R": "dao:calm"
          }
        },
        {
          "text": "你不知道梦盈求过什么。你只想在七日之内替她了却冤屈，然后随妻子而去。"
        },
        {
          "text": "临死前，你已在井边找到了那支银簪。你把它藏在袖里，没来得及告诉谁，这支旧物属于何人。"
        },
        {
          "text": "止水没有劝你活，也没有劝你死。他只递来木剑，陪你再走一趟那条夜路。"
        },
        {
          "text": "他没有问妻子会不会醒。那一夜，答案不在道士手中，也不在任何人敢许下的誓言里。"
        }
      ],
      "next": "f_well"
    },
    "f_well": {
      "pov": "wang",
      "scene": "shen_well",
      "cg": "well_bones",
      "segments": [
        {
          "text": "井中遗骨被收起，沈夫人跪在湿泥边。梦盈站在不远处，眼里没有催促，也没有原谅。",
          "stage": {
            "clear": true,
            "L": "wang:grief",
            "C": "shen:terror",
            "R": "gui:sorrow"
          }
        },
        {
          "speaker": "dao",
          "text": "手上沾了血的魂，什么也给不了别人。"
        },
        {
          "text": "这是一句公平的提醒。你不知道梦盈曾许诺以魂相换，也不知道此刻的选择会让那句承诺走向哪里。"
        },
        {
          "speaker": "shen",
          "text": "你说，我该怎么做？"
        },
        {
          "text": "王生把银簪握在掌心，没有再取出来。井水映着三张苍白的脸，谁也没有催另一人快些回答。"
        }
      ],
      "choices": [
        {
          "text": "请她认罪，让她安息",
          "next": "e4",
          "changes": {
            "addFlag": "justice"
          }
        },
        {
          "text": "让她偿命，替她讨债",
          "next": "e5",
          "changes": {
            "addFlag": "blood"
          }
        }
      ]
    },
    "l_keep": {
      "scene": "study_night",
      "card": "第二幕 · 皮",
      "segments": [
        {
          "text": "你决定把阿绢留作外室。她起初像是在完成一桩谋算，日子久了，却开始盼你推门时的脚步声。",
          "stage": {
            "clear": true,
            "L": null,
            "C": "nv:love",
            "R": null
          }
        },
        {
          "text": "你们没有谈及妻子，也没有说破相依背后的代价。每一次亲近，阳气都让她的画皮褪得更快。"
        },
        {
          "speaker": "nv",
          "text": "我好像……忘了一件很要紧的事。"
        },
        {
          "text": "她每夜仍到井边守候，回来时脸色更淡。你只当她是思乡，却没有问她为何总在子时离开。"
        },
        {
          "text": "你们说的闲话越来越多，能说的真话却越来越少。她怕皮相消散，你怕承认自己一直在逃避妻子。"
        },
        {
          "text": "她偶尔望向门外，像是听见有人从井边归来。你从未问她梦里是谁，也从未问自己为何不问。"
        }
      ],
      "next": "l_peek"
    },
    "l_peek": {
      "scene": "study_night",
      "cg": "window_peek",
      "segments": [
        {
          "text": "子夜，你想悄悄送她一枝新簪。窗缝里看见的却是青面鬼影，正把一张人皮铺在榻上补画。",
          "stage": {
            "clear": true,
            "L": "wang:fear",
            "C": null,
            "R": null
          }
        },
        {
          "text": "灯火映着她的手。那张脸明明属于你熟悉的女子，却正在一笔一笔地从她身上剥落。"
        },
        {
          "text": "你终于想起初见时她看向胸口的目光。你可以逃，也可以留下来听她把没有说完的事说完。"
        },
        {
          "text": "你手中的新簪掉在地上，声音轻得像一片叶子。屋里的女子没有听见，或许也不愿听见。"
        }
      ],
      "choices": [
        {
          "text": "逃回家，先护住妻子",
          "next": "l_flee"
        },
        {
          "text": "留下来，听她说完",
          "next": "l_stay"
        }
      ]
    },
    "l_stay": {
      "scene": "study_night",
      "segments": [
        {
          "speaker": "gui",
          "text": "没有一颗心，我就要散了。可你若不愿，我不会取你的心。",
          "stage": {
            "clear": true,
            "L": null,
            "C": "nv:love",
            "R": "gui:sorrow"
          }
        },
        {
          "text": "她说她已忘了许多生前的事，只记得井水很冷，记得你曾经看她时没有把她当作一件东西。"
        },
        {
          "text": "你看见她的鬼相，也看见她仍愿停手。你终于明白，爱意不替你免去该负的责任。"
        },
        {
          "text": "你甘愿把心交给她。她带着这颗心走向转生，陈氏只看见你安详地睡去，再没有醒来。"
        },
        {
          "text": "你没有要求她变回美人的样子。她也没有用美貌留住你，终于肯把自己的害怕说出来。"
        },
        {
          "text": "你把手放在胸前，第一次不再把心动当作占有的凭据。她看着你，眼里有悲伤，也有些许安稳。"
        }
      ],
      "next": "e8"
    },
    "l_flee": {
      "scene": "home_night",
      "segments": [
        {
          "text": "你逃回家，看见熟睡的妻子。她不知道你在书斋里做过什么，你也不知道该如何面对她。",
          "stage": {
            "clear": true,
            "L": null,
            "C": "wang:fear",
            "R": null
          }
        },
        {
          "text": "书斋里还有阿绢。你想保护妻子，也想抹去自己的欲望留下的痕迹。"
        },
        {
          "text": "天将亮时，你把这两种心思都带到门外。一个选择能毁掉那间屋，也可能毁掉你最后一点自省。"
        },
        {
          "text": "你望着妻子的睡颜，终于看见自己把温情当作退路。桌上那封信仍在，像一件无法推给别人的旧事。"
        }
      ],
      "choices": [
        {
          "text": "烧书斋，怕她再害人",
          "next": "l_fire"
        },
        {
          "text": "去问道士，求一个护法",
          "next": "l_dao"
        }
      ]
    },
    "l_fire": {
      "scene": "study_night",
      "cg": "study_fire",
      "segments": [
        {
          "text": "火从书斋窗纸里窜起。阿绢被困在屋中，画皮又一次被火牵动，怨恨与恐惧同时逼到尽头。",
          "stage": {
            "clear": true,
            "L": null,
            "C": null,
            "R": "gui:rage"
          }
        },
        {
          "text": "她为了自卫杀了你。你倒在自己点起的火光之外，终于看见这把火并没有替任何人洗清罪责。"
        },
        {
          "text": "火熄后，她在废墟间游荡，忘了来时的路。没有人能说这是谁赢来的结局。"
        },
        {
          "text": "火光映出你最初的贪恋，也映出你临终前的恐惧。她的反击并未让她得到自由。"
        }
      ],
      "next": "e6"
    },
    "l_dao": {
      "scene": "temple",
      "segments": [
        {
          "text": "止水认出你身上的邪气，也看出那是你自己一步步招来的。他没有因你求救就抹去你做过的选择。",
          "stage": {
            "clear": true,
            "L": null,
            "C": null,
            "R": "dao:stern"
          }
        },
        {
          "speaker": "dao",
          "text": "是你招来的，也是你欠她的。"
        },
        {
          "text": "若你先前讥讽过他，他只说：江湖术士未必都对，但不信一个人，也不能叫伤害变成无事。"
        },
        {
          "text": "他拒绝救你，也拒绝替你杀她。你离开破观，决定自己回去放火。"
        },
        {
          "text": "止水没有说自己早知如此。他只看着你离开，像看着一个已经走到门槛前的人终于不肯回头。"
        }
      ],
      "next": "l_fire2"
    },
    "l_fire2": {
      "scene": "study_night",
      "cg": "study_fire",
      "segments": [
        {
          "text": "你回到书斋，亲手点燃屋梁。她在火里杀了你。止水循着怨气赶来，降服了已被血债缠住的她。",
          "stage": {
            "clear": true,
            "L": null,
            "C": "dao:act",
            "R": "gui:rage"
          }
        },
        {
          "text": "火势渐小，道士站在灰烬前很久。拂尘落在他脚边，像一条终于承认自己也无能为力的白线。"
        },
        {
          "text": "他不能把你带回来，也不能替她洗去杀人的因果。夜色里只剩屋梁断裂的声音。"
        },
        {
          "text": "天明后，邻人只看见塌下的屋檐。没人能从灰里分辨，哪一块属于谎言，哪一块属于悔意。"
        }
      ],
      "next": "e7"
    },
    "e1": {
      "isEnding": true,
      "ending": {
        "id": "E1",
        "title": "公道",
        "type": "true",
        "achievement": "ach_e1",
        "closing": "沈夫人认下旧罪，梦盈遗骨入土。止水为她超度；她以生前模样向你们告别，走进来世。陈氏又把蒸饼包给门前的老妇。",
        "commentary": "异史氏曰：公道迟来，仍能替一个人留下姓名。"
      },
      "segments": [
        {
          "text": "晨光照过新坟。陈氏把空下来的夹袄叠好，像把一段不属于自己的旧梦收进柜中。"
        },
        {
          "text": "止水终于破戒，却没有替任何人改命。他只是送一个终于被看见的人，走完最后一段路。"
        },
        {
          "text": "陈氏仍会妒，也仍会善待街边的人。她不再把这两件事当作互相抵消的罪证。"
        }
      ]
    },
    "e2": {
      "isEnding": true,
      "ending": {
        "id": "E2",
        "title": "未度",
        "type": "normal",
        "achievement": "ach_e2",
        "closing": "公道得雪，遗骨归土，却无人为她超度。画皮的颜色日日褪去，某个清晨，她散成绢上的淡墨。",
        "commentary": "异史氏曰：有人终于听见她说话，却来不及再送她一程。"
      },
      "segments": [
        {
          "text": "清晨，榻上只剩一片绢。眉眼淡到几乎认不出，银簪却仍安静地躺在旁边。"
        },
        {
          "text": "王生和陈氏把绢与遗骨一同安葬。没人再称她妖，也没人知道她是否听见了最后的祷词。"
        },
        {
          "text": "后来王家无人再提那一夜。褪色的绢上没有名字，村里却记得井边多了一座坟。"
        }
      ]
    },
    "e3": {
      "isEnding": true,
      "ending": {
        "id": "E3",
        "title": "血债",
        "type": "bad",
        "achievement": "ach_e3",
        "closing": "她报了仇，却再不能投生。止水将她降服；王生一家虽平安，也成了那笔血债的帮凶。",
        "commentary": "异史氏曰：仇恨能让人抵达仇家门前，却不能领人回家。"
      },
      "segments": [
        {
          "text": "山坡上的新土没有立下碑。沈府的门仍在，院墙内外却多了一段无人愿提的沉默。"
        },
        {
          "text": "你保住了家人的性命，却没能替梦盈留下另一条路。"
        },
        {
          "text": "你们把井重新封好，封不住的却是每次经过时那句没说完的话。"
        }
      ]
    },
    "e4": {
      "isEnding": true,
      "ending": {
        "id": "E4",
        "title": "同心",
        "type": "true",
        "achievement": "ach_e4",
        "closing": "第七日，止水才说出梦盈的约定。她放弃转生，把洁净的魂化作一颗心，经道士之手渡入陈氏体内。清晨，陈氏醒来，左眼下多了一颗朱砂痣。王生说：「好好活下去。这回，我们一起。」",
        "commentary": "异史氏曰：有时救人的不是奇术，是有人愿意把最后一点自己交出来。"
      },
      "segments": [
        {
          "text": "止水说出那夜的约定：梦盈愿以魂相换，成全你们。她的魂没有染血，终于能够化成一颗心。"
        },
        {
          "text": "暖光落入陈氏胸前。醒来时，她左眼下多了一颗朱砂痣；王生握住她的手，二人没有再放开。"
        },
        {
          "text": "陈氏醒来后问过梦盈去了哪里。止水没有说她已消失，只说有人替她走完了来路。"
        }
      ]
    },
    "e5": {
      "isEnding": true,
      "ending": {
        "id": "E5",
        "title": "黄泉",
        "type": "bad",
        "achievement": "ach_e5",
        "closing": "止水第七日才说出梦盈的约定，已经来不及了。染血的魂化不成心；王生守在妻子身边，胸中借来的命随主而去。",
        "commentary": "异史氏曰：没有人自弃性命，只是来不及相还的心，终究归了原主。"
      },
      "segments": [
        {
          "text": "止水带来迟到的约定。梦盈想成全你们，可亲手杀人的魂魄已染了血，再也化不成心。"
        },
        {
          "text": "王生守着妻子。第七日夜，胸口那缕借来的温热随她停下；他没有自尽，只是再也醒不过来。"
        },
        {
          "text": "第七日过后，陈氏仍守在屋里。窗前那支拂尘没有倒，白尾却再也没有动过。"
        }
      ]
    },
    "e6": {
      "isEnding": true,
      "ending": {
        "id": "E6",
        "title": "自卫",
        "type": "bad",
        "achievement": "ach_e6",
        "closing": "他死在自己点起的火里。她在废墟中游荡，渐渐忘了来时的路。",
        "commentary": "异史氏曰：想以火遮住自己的欲望，最后只照见一片废墟。"
      },
      "segments": [
        {
          "text": "陈氏只知道丈夫再没有回来。她守着家门，等一场迟迟不会来的解释。"
        },
        {
          "text": "书斋烧成灰后，阿绢再也找不到那口井，也找不到曾经的自己。"
        },
        {
          "text": "烧毁的书页随风落进院墙外。陈氏捡起一角，认不出上面曾写过什么。"
        }
      ]
    },
    "e7": {
      "isEnding": true,
      "ending": {
        "id": "E7",
        "title": "焚屋",
        "type": "bad",
        "achievement": "ach_e7",
        "closing": "他死了，她被止水降服。道士在灰烬前站了很久，旧戒仍没能护住任何人。",
        "commentary": "异史氏曰：克制若只用来旁观，终有一日也会被灰烬问罪。"
      },
      "segments": [
        {
          "text": "止水把她降服后，为她护住一缕未散的魂。他没有替她超度，也没有替你解脱。"
        },
        {
          "text": "灰烬随风落在破观门前。道士拾起拂尘，白丝已被烟熏成灰色。"
        },
        {
          "text": "止水没有念超度的经。他只把两个人的名字记在心里，像承认自己这回也救不了谁。"
        }
      ]
    },
    "e8": {
      "isEnding": true,
      "ending": {
        "id": "E8",
        "title": "替身",
        "type": "normal",
        "achievement": "ach_e8",
        "closing": "他把心甘愿给了她。她带着这颗心去投生，陈氏只看见丈夫安详地睡去，再没醒来。",
        "commentary": "异史氏曰：甘愿给出的心，既救一人，也让另一个人终于能走。"
      },
      "segments": [
        {
          "text": "阿绢没有披回那张褪色的脸。她带着你甘愿相予的心走进来世，没再回头。"
        },
        {
          "text": "陈氏替你合上衣襟。她不知道你为何安睡，只知道有些离别，不会留下可供追问的伤口。"
        },
        {
          "text": "那颗心不再属于一个被迫献出的陌生人。她走过城门时，晨雾里终于有了可以回头的路。"
        }
      ]
    }
  }
};
