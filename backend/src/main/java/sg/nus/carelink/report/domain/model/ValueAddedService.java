package sg.nus.carelink.report.domain.model;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Catalogue entry for an optional service that an elder may request (UC-EL02).
 *
 * @param durationMinutes how long the visit an approved request dispatches lasts (UC-FM08)
 */
public record ValueAddedService(
        Long id,
        String name,
        String description,
        int durationMinutes,
        Status status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public ValueAddedService {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(status, "status");
        if (durationMinutes <= 0) {
            throw new IllegalArgumentException("A service must last some time: " + durationMinutes + " minutes");
        }
    }

    public boolean available() {
        return status == Status.AVAILABLE;
    }

    /** When a visit of this service that starts at {@code start} is over. */
    public LocalDateTime endFor(LocalDateTime start) {
        return Objects.requireNonNull(start, "start").plusMinutes(durationMinutes);
    }

    public enum Status {
        AVAILABLE, UNAVAILABLE
    }
}
