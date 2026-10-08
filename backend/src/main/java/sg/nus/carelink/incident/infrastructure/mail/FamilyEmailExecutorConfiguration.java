package sg.nus.carelink.incident.infrastructure.mail;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** SMTP never runs on the committed source's HTTP thread; rejected work remains recorded. @author Wang Zhili */
@Configuration(proxyBeanMethods = false)
class FamilyEmailExecutorConfiguration {
	@Bean("familyEmailExecutor") ThreadPoolTaskExecutor familyEmailExecutor() {
		var executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(1); executor.setMaxPoolSize(1); executor.setQueueCapacity(100);
		executor.setThreadNamePrefix("fm05-email-");
		return executor;
	}
}
