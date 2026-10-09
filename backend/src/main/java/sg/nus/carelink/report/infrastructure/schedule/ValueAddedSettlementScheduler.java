package sg.nus.carelink.report.infrastructure.schedule;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import sg.nus.carelink.report.application.ValueAddedServiceDispatchService;

/**
 * Nothing but a trigger: marks dispatched extra-service requests completed or cancelled once
 * their visits are. Which requests and why is {@link ValueAddedServiceDispatchService#settleWithVisits}'s
 * business. Every five minutes by default ({@code carelink.value-added.settle-interval}).
 */
@Component
class ValueAddedSettlementScheduler {

    private static final Logger log = LoggerFactory.getLogger(ValueAddedSettlementScheduler.class);

    private final ValueAddedServiceDispatchService dispatch;

    ValueAddedSettlementScheduler(ValueAddedServiceDispatchService dispatch) {
        this.dispatch = dispatch;
    }

    @Scheduled(fixedDelayString = "${carelink.value-added.settle-interval:PT5M}",
            initialDelayString = "${carelink.value-added.settle-initial-delay:PT1M}")
    void settle() {
        try {
            int settled = dispatch.settleWithVisits();
            if (settled > 0) {
                log.info("Settled {} value-added service requests with their visits", settled);
            }
        }
        catch (RuntimeException failure) {
            log.warn("Value-added service settlement failed: {}", failure.getClass().getSimpleName());
        }
    }
}
