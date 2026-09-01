package sg.nus.carelink.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/**
 * 业务阈值集中配置，避免硬编码散落在各模块。
 *
 * <p>这些数字在提案里是需求的一部分（迟到判定、超时升级、周报回溯窗口），
 * 做成配置项而非常量，是为了演示时能当场调整、也便于测试注入不同取值。
 */
@ConfigurationProperties(prefix = "carelink")
public record CareLinkProperties(

		/** 超过该时长未打卡即判定为迟到 */
		@DefaultValue("10m") Duration lateArrivalThreshold,

		/** 异常未处置超过该时长自动升级 */
		@DefaultValue("2h") Duration incidentEscalationDelay,

		/** 周报与趋势图的回溯窗口 */
		@DefaultValue("30d") Duration reportLookbackWindow
) {
}
