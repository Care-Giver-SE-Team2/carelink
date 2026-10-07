package sg.nus.carelink.report.domain.model;

import java.time.LocalDateTime;
import java.util.Objects;

/** Catalogue entry for an optional service that an elder may request (UC-EL02). */
public record ValueAddedService(
        Long id,
        String name,
        String description,
        Status status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public ValueAddedService {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(status, "status");
    }

    public boolean available() {
        return status == Status.AVAILABLE;
    }

    public enum Status {
        AVAILABLE, UNAVAILABLE
    }
}
