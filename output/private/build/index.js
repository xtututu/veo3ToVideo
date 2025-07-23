"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const block_basekit_server_api_1 = require("@lark-opdev/block-basekit-server-api");
const { t } = block_basekit_server_api_1.field;
const feishuDm = ['feishu.cn', 'feishucdn.com', 'larksuitecdn.com', 'larksuite.com', 'api.chatfire.cn', 'api.xunkecloud.cn'];
// 通过addDomainList添加请求接口的域名，不可写多个addDomainList，否则会被覆盖
block_basekit_server_api_1.basekit.addDomainList([...feishuDm, 'api.exchangerate-api.com',]);
block_basekit_server_api_1.basekit.addField({
    // 定义捷径的i18n语言资源
    i18n: {
        messages: {
            'zh-CN': {
                'videoMethod': '视频生成方式',
                'metLabelOne': '文生视频',
                'metLabelTwo': '图生视频',
                'videoPrompt': '视频提示词',
                'refImage': '参考图片',
            },
            'en-US': {
                'videoMethod': 'Video generation method',
                'metLabelOne': 'Text-to-video',
                'metLabelTwo': 'Image-to-video',
                'videoPrompt': 'Video prompt',
                'refImage': 'Reference image',
            },
            'ja-JP': {
                'videoMethod': 'ビデオ生成方式',
                'metLabelOne': 'テキスト-to-ビデオ',
                'metLabelTwo': 'イメージ-to-ビデオ',
                'videoPrompt': 'ビデオ提示词',
                'refImage': '参考画像',
            },
        }
    },
    authorizations: [
        {
            id: 'auth_id_1',
            platform: 'xunkecloud',
            type: block_basekit_server_api_1.AuthorizationType.HeaderBearerToken,
            required: true,
            instructionsUrl: "http://api.xunkecloud.cn/login",
            label: '关联账号',
            icon: {
                light: '',
                dark: ''
            }
        }
    ],
    // 定义捷径的入参
    formItems: [
        {
            key: 'videoMethod',
            label: t('videoMethod'),
            component: block_basekit_server_api_1.FieldComponent.Radio,
            defaultValue: { label: t('metLabelOne'), value: 'textToVideo' },
            props: {
                options: [
                    { label: t('metLabelOne'), value: 'textToVideo' },
                    { label: t('metLabelTwo'), value: 'imageToVideo' },
                ]
            },
        },
        {
            key: 'videoPrompt',
            label: t('videoPrompt'),
            component: block_basekit_server_api_1.FieldComponent.Input,
            props: {
                placeholder: '请输入视频提示词',
            },
            validator: {
                required: true,
            }
        },
        {
            key: 'refImage',
            label: t('refImage'),
            component: block_basekit_server_api_1.FieldComponent.FieldSelect,
            props: {
                supportType: [block_basekit_server_api_1.FieldType.Attachment],
            }
        },
    ],
    // 定义捷径的返回结果类型
    resultType: {
        type: block_basekit_server_api_1.FieldType.Attachment
    },
    execute: async (formItemParams, context) => {
        const { videoMethod = '', videoPrompt = '', refImage = '' } = formItemParams;
        let englishPrompt = videoPrompt; // 添加变量声明
        /** 为方便查看日志，使用此方法替代console.log */
        function debugLog(arg) {
            // @ts-ignore
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                ...arg
            }));
        }
        // 翻译视频提示词为英文
        try {
            // 提取请求参数并打印
            const requestOptions = {
                method: 'POST',
                body: JSON.stringify({
                    model: 'veo3',
                    "prompt": videoPrompt,
                    ...(refImage && refImage.length > 0 ? { "images": [refImage[0].tmp_url] } : {}),
                    "enhance_prompt": true
                })
            };
            const taskResp = await context.fetch('http://api.xunkecloud.cn/v1/images/generations', requestOptions, 'auth_id_1').then(res => res.json());
            debugLog({ '=1 视频创建接口结果': taskResp });
            const initialResult = await taskResp.json();
            const taskId = initialResult.id;
            if (!taskId) {
                return {
                    code: block_basekit_server_api_1.FieldCode.Error,
                };
            }
            const apiUrl = `https://api.chatfire.cn/veo/v1/videos/generations?id=${taskId}`;
            let checkUrl = async () => {
                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': 'Bearer sk-fEYjuVld8fnsycc3XIe5jGJuFW4fMpR0kbIKLmtKpIgsBvu1'
                    }
                });
                debugLog({ '=1 视频结果查询结果': response });
                const result = await response.json();
                if (result && typeof result === 'object' && 'video_url' in result && typeof result.video_url === 'string') {
                    return result.video_url;
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    return checkUrl();
                }
            };
            const videoUrl = await checkUrl();
            let url = [
                {
                    type: 'url',
                    text: englishPrompt,
                    link: videoUrl
                }
            ];
            return {
                code: block_basekit_server_api_1.FieldCode.Success, // 0 表示请求成功
                // data 类型需与下方 resultType 定义一致
                data: (url.map(({ link }, index) => {
                    console.log(link);
                    if (!link || typeof link !== 'string') {
                        return undefined;
                    }
                    const name = link.split('/').slice(-1)[0];
                    return {
                        name: '随机名字' + index + name + '.mp4',
                        content: link,
                        contentType: "attachment/url"
                    };
                })).filter((v) => v)
            };
            // 请避免使用 debugLog(url) 这类方式输出日志，因为所查到的日志是没有顺序的，为方便排查错误，对每个log进行手动标记顺序
            debugLog({
                '===1 url为空': url
            });
            return {
                code: block_basekit_server_api_1.FieldCode.Error,
            };
        }
        catch (e) {
            console.log('====error', String(e));
            debugLog({
                '===999 异常错误': String(e)
            });
            /** 返回非 Success 的错误码，将会在单元格上显示报错，请勿返回msg、message之类的字段，它们并不会起作用。
             * 对于未知错误，请直接返回 FieldCode.Error，然后通过查日志来排查错误原因。
             */
            return {
                code: block_basekit_server_api_1.FieldCode.Error,
            };
        }
    }
});
exports.default = block_basekit_server_api_1.basekit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtRkFBZ0o7QUFDaEosTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLGdDQUFLLENBQUM7QUFFcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxpQkFBaUIsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQzNILHFEQUFxRDtBQUNyRCxrQ0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztBQUVsRSxrQ0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNmLGdCQUFnQjtJQUNmLElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRTtZQUNSLE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsUUFBUTtnQkFDdkIsYUFBYSxFQUFFLE1BQU07Z0JBQ3JCLGFBQWEsRUFBRSxNQUFNO2dCQUNyQixhQUFhLEVBQUUsT0FBTztnQkFDdEIsVUFBVSxFQUFFLE1BQU07YUFDbkI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLHlCQUF5QjtnQkFDeEMsYUFBYSxFQUFFLGVBQWU7Z0JBQzlCLGFBQWEsRUFBRSxnQkFBZ0I7Z0JBQy9CLGFBQWEsRUFBRSxjQUFjO2dCQUM3QixVQUFVLEVBQUUsaUJBQWlCO2FBQzlCO1lBQ0QsT0FBTyxFQUFFO2dCQUNOLGFBQWEsRUFBRSxTQUFTO2dCQUN6QixhQUFhLEVBQUUsYUFBYTtnQkFDNUIsYUFBYSxFQUFFLGFBQWE7Z0JBQzVCLGFBQWEsRUFBRSxRQUFRO2dCQUN2QixVQUFVLEVBQUUsTUFBTTthQUNuQjtTQUNGO0tBQ0Y7SUFFRCxjQUFjLEVBQUU7UUFDZDtZQUNFLEVBQUUsRUFBRSxXQUFXO1lBQ2YsUUFBUSxFQUFFLFlBQVk7WUFDdEIsSUFBSSxFQUFFLDRDQUFpQixD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