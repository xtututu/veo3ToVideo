"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const block_basekit_server_api_1 = require("@lark-opdev/block-basekit-server-api");
const { t } = block_basekit_server_api_1.field;
const feishuDm = ['feishu.cn', 'feishucdn.com', 'larksuitecdn.com', 'larksuite.com', 'api.chatfire.cn', 'api.xunkecloud.cn', 'test.xunkecloud.cn'];
// 通过addDomainList添加请求接口的域名，不可写多个addDomainList，否则会被覆盖
block_basekit_server_api_1.basekit.addDomainList([...feishuDm, 'api.exchangerate-api.com',]);
block_basekit_server_api_1.basekit.addField({
    // 定义捷径的i18n语言资源
    i18n: {
        messages: {
            'zh-CN': {
                'videoMethod': '模型选择',
                'videoPrompt': '视频提示词',
                'refImage': '参考图片',
                'seconds': '视频时长',
                'size': '视频尺寸',
            },
            'en-US': {
                'videoMethod': 'Model selection',
                'videoPrompt': 'Video prompt',
                'refImage': 'Reference image',
                'seconds': 'Video duration',
                'size': 'Video size',
            },
            'ja-JP': {
                'videoMethod': 'モデル選択',
                'videoPrompt': 'ビデオ提示词',
                'refImage': '参考画像',
                'seconds': 'ビデオ再生時間',
                'size': 'ビデオサイズ',
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
            component: block_basekit_server_api_1.FieldComponent.SingleSelect,
            defaultValue: { label: t('veo3.1'), value: 'veo3.1' },
            props: {
                options: [
                    { label: 'veo3', value: 'veo3' },
                    { label: 'veo3.1', value: 'veo3.1' },
                    { label: 'veo3.1-pro', value: 'veo3.1-pro' },
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
        {
            key: 'seconds',
            label: t('seconds'),
            component: block_basekit_server_api_1.FieldComponent.SingleSelect,
            defaultValue: { label: t('12'), value: '12' },
            props: {
                options: [
                    { label: '12', value: '12' },
                    { label: '8', value: '8' },
                    { label: '4', value: '4' },
                ]
            },
        },
        {
            key: 'size',
            label: t('size'),
            component: block_basekit_server_api_1.FieldComponent.SingleSelect,
            defaultValue: { label: t('720x1280'), value: '720x1280' },
            props: {
                options: [
                    { label: '720x1280', value: '720x1280' },
                    { label: '1280x720', value: '1280x720' },
                    { label: '1024x1792', value: '1024x1792' },
                    { label: '1792x1024', value: '1792x1024' },
                ]
            },
        },
    ],
    // 定义捷径的返回结果类型
    resultType: {
        type: block_basekit_server_api_1.FieldType.Attachment
    },
    execute: async (formItemParams, context) => {
        const { videoMethod = '', videoPrompt = '', refImage = '', seconds = '', size = '' } = formItemParams;
        /** 为方便查看日志，使用此方法替代console.log */
        function debugLog(arg) {
            // @ts-ignore
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                ...arg
            }));
        }
        // 常量定义
        const API_BASE_URL = 'http://test.xunkecloud.cn/v1/videos';
        const POLLING_INTERVAL = 5000; // 5秒间隔
        const MAX_POLLING_TIME = 900000; // 900秒最大等待时间
        // 错误视频URL配置
        const ERROR_VIDEOS = {
            DEFAULT: 'https://pay.xunkecloud.cn/image/Wrong.mp4',
            OVERRUN: 'https://pay.xunkecloud.cn/image/Overrun.mp4',
            NO_CHANNEL: 'https://pay.xunkecloud.cn/image/unusual.mp4',
            INSUFFICIENT: 'https://pay.xunkecloud.cn/image/Insufficient.mp4',
            INVALID_TOKEN: 'https://pay.xunkecloud.cn/image/tokenError.mp4'
        };
        // 创建错误响应的辅助函数
        const createErrorResponse = (name, videoUrl) => ({
            code: block_basekit_server_api_1.FieldCode.Success,
            data: [{
                    name: `${name}.mp4`,
                    content: videoUrl,
                    contentType: 'attachment/url'
                }]
        });
        try {
            // 构建请求体
            const requestBody = {
                model: videoMethod.value,
                prompt: videoPrompt,
                seconds: seconds.value,
                size: size.value
            };
            // 如果refImage存在且有第一个元素的tmp_url，则添加input_reference参数
            if (refImage && refImage.length > 0) {
                requestBody.input_reference = refImage
                    .filter(item => item && item.tmp_url) // 过滤出有tmp_url的元素
                    .map(item => item.tmp_url.trim()); // 去除可能的空格并提取tmp_url
            }
            // 创建视频生成任务
            const createTask = await context.fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }, 'auth_id_1');
            const taskResp = await createTask.json();
            debugLog({ taskId: taskResp.id, message: '视频生成任务已创建' });
            // 检查任务ID是否返回
            if (taskResp?.id) {
                // 轮询获取视频详情
                const videoDetailUrl = `${API_BASE_URL}/${taskResp.id}`;
                const detailRequestOptions = {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                };
                const startTime = Date.now();
                let videoDetailResp;
                let isPollingComplete = false;
                debugLog("开始轮询任务");
                // 轮询逻辑
                while (!isPollingComplete && (Date.now() - startTime) < MAX_POLLING_TIME) {
                    const getTaskDetail = await context.fetch(videoDetailUrl, detailRequestOptions, 'auth_id_1');
                    videoDetailResp = await getTaskDetail.json();
                    // 检查状态
                    if (videoDetailResp?.status === 'failed') {
                        debugLog({ message: '视频生成失败', errorType: '官方错误，提示词/图片违规' });
                        return createErrorResponse('官方错误，提示词/图片违规', ERROR_VIDEOS.DEFAULT);
                    }
                    else if (videoDetailResp?.status === 'completed') {
                        isPollingComplete = true;
                        debugLog({ message: '视频生成完成' });
                    }
                    else {
                        // 未完成，等待后继续轮询
                        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
                    }
                }
                // 检查是否超时
                if (!isPollingComplete) {
                    debugLog({ message: '视频生成超时', errorType: '轮询超时' });
                    return {
                        code: block_basekit_server_api_1.FieldCode.Error,
                        data: createErrorResponse('捷径异常', ERROR_VIDEOS.OVERRUN).data
                    };
                }
                // 提取视频URL并返回成功响应
                const videoUrl = videoDetailResp?.video_url || '';
                return {
                    code: block_basekit_server_api_1.FieldCode.Success,
                    data: [{
                            name: `${videoPrompt}.mp4`,
                            content: videoUrl,
                            contentType: 'attachment/url'
                        }]
                };
            }
            else {
                throw new Error(taskResp?.error?.message || '任务创建失败，未返回任务ID');
            }
        }
        catch (error) {
            const errorMessage = String(error);
            debugLog({ '异常错误': errorMessage });
            // 根据错误类型返回相应的错误视频
            if (errorMessage.includes('无可用渠道')) {
                debugLog({ message: '无可用渠道', errorType: '渠道错误', errorMessage });
                return createErrorResponse('捷径异常', ERROR_VIDEOS.NO_CHANNEL);
            }
            else if (errorMessage.includes('令牌额度已用尽')) {
                debugLog({ message: '令牌额度已用尽', errorType: '余额不足', errorMessage });
                return createErrorResponse('余额耗尽', ERROR_VIDEOS.INSUFFICIENT);
            }
            else if (errorMessage.includes('无效的令牌')) {
                debugLog({ message: '无效的令牌', errorType: '令牌错误', errorMessage });
                return createErrorResponse('无效的令牌', ERROR_VIDEOS.INVALID_TOKEN);
            }
            // 未知错误
            return {
                code: block_basekit_server_api_1.FieldCode.Error
            };
        }
    }
});
exports.default = block_basekit_server_api_1.basekit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtRkFBZ0o7QUFDaEosTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLGdDQUFLLENBQUM7QUFFcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxpQkFBaUIsRUFBQyxtQkFBbUIsRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2hKLHFEQUFxRDtBQUNyRCxrQ0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztBQUVsRSxrQ0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNmLGdCQUFnQjtJQUNmLElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRTtZQUNSLE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsTUFBTTtnQkFDckIsYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixTQUFTLEVBQUUsTUFBTTtnQkFDakIsTUFBTSxFQUFFLE1BQU07YUFDZjtZQUNELE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsaUJBQWlCO2dCQUNoQyxhQUFhLEVBQUUsY0FBYztnQkFDN0IsVUFBVSxFQUFFLGlCQUFpQjtnQkFDN0IsU0FBUyxFQUFFLGdCQUFnQjtnQkFDM0IsTUFBTSxFQUFFLFlBQVk7YUFDckI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLE9BQU87Z0JBRXRCLGFBQWEsRUFBRSxRQUFRO2dCQUN2QixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1NBQ0Y7S0FDRjtJQUVELGNBQWMsRUFBRTtRQUNkO1lBQ0UsRUFBRSxFQUFFLFdBQVc7WUFDZixRQUFRLEVBQUUsWUFBWTtZQUN0QixJQUFJLEVB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