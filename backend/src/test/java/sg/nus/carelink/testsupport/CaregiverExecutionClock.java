package sg.nus.carelink.testsupport;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Keep manager-published positive execution fixtures away from midnight, regardless of test run time. */
@TestConfiguration(proxyBeanMethods = false)
public class CaregiverExecutionClock {
    @Bean
    @Primary
    Clock caregiverExecutionClock() {
        return Clock.fixed(Instant.parse("2026-10-16T04:00:00Z"), ZoneId.of("Asia/Singapore"));
    }
}
