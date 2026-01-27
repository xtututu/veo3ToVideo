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
                'modelBrand': '迅客'
            },
            'en-US': {
                'videoMethod': 'Model selection',
                'videoPrompt': 'Video prompt',
                'refImage': 'Reference image',
                'seconds': 'Video duration',
                'size': 'Video size',
                'modelBrand': 'Xunke'
            },
            'ja-JP': {
                'videoMethod': 'モデル選択',
                'videoPrompt': 'ビデオ提示词',
                'refImage': '参考画像',
                'seconds': 'ビデオ再生時間',
                'size': 'ビデオサイズ',
                'modelBrand': 'Xunke'
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
            defaultValue: { label: t('modelBrand') + ' Ve3', value: 'veo3.1' },
            props: {
                options: [
                    { label: t('modelBrand') + ' Ve3', value: 'veo3' },
                    { label: t('modelBrand') + ' Ve3.1', value: 'veo3.1' },
                    { label: t('modelBrand') + ' Ve3.1-pro', value: 'veo3.1-pro' },
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
        const API_BASE_URL = 'http://api.xunkecloud.cn/v1/videos';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtRkFBZ0o7QUFDaEosTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLGdDQUFLLENBQUM7QUFFcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxpQkFBaUIsRUFBQyxtQkFBbUIsRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2hKLHFEQUFxRDtBQUNyRCxrQ0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztBQUVsRSxrQ0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNmLGdCQUFnQjtJQUNmLElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRTtZQUNSLE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsTUFBTTtnQkFDckIsYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixTQUFTLEVBQUUsTUFBTTtnQkFDakIsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsWUFBWSxFQUFDLElBQUk7YUFFbEI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLGlCQUFpQjtnQkFDaEMsYUFBYSxFQUFFLGNBQWM7Z0JBQzdCLFVBQVUsRUFBRSxpQkFBaUI7Z0JBQzdCLFNBQVMsRUFBRSxnQkFBZ0I7Z0JBQzNCLE1BQU0sRUFBRSxZQUFZO2dCQUNwQixZQUFZLEVBQUMsT0FBTzthQUNyQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsT0FBTztnQkFFdEIsYUFBYSxFQUFFLFFBQVE7Z0JBQ3ZCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixTQUFTLEVBQUUsU0FBUztnQkFDcEIsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLFlBQVksRUFBQyxPQUFPO2FBQ3JCO1NBQ0Y7S0FDRjtJQUVELGNB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