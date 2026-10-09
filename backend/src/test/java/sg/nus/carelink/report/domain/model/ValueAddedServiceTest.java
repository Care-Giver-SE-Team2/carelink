package sg.nus.carelink.report.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

class ValueAddedServiceTest {
    @Test void availableStatusIsAvailable() {
        assertThat(new ValueAddedService(1L, "Hospital escort", null, 180,
                ValueAddedService.Status.AVAILABLE, null, null).available()).isTrue();
    }
    @Test void unavailableStatusIsNotAvailable() {
        assertThat(new ValueAddedService(1L, "Hospital escort", null, 180,
                ValueAddedService.Status.UNAVAILABLE, null, null).available()).isFalse();
    }
    @Test void aVisitOfTheServiceEndsItsDurationAfterItStarts() {
        assertThat(new ValueAddedService(1L, "Hospital escort", null, 180,
                ValueAddedService.Status.AVAILABLE, null, null).endFor(LocalDateTime.of(2026, 10, 8, 14, 0)))
                .isEqualTo(LocalDateTime.of(2026, 10, 8, 17, 0));
    }
    @Test void aServiceMustLastSomeTime() {
        assertThatThrownBy(() -> new ValueAddedService(1L, "Hospital escort", null, 0,
                ValueAddedService.Status.AVAILABLE, null, null)).isInstanceOf(IllegalArgumentException.class);
    }
}
