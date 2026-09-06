package sg.nus.carelink.visit.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * JPA entity for table vital_sign.
 *
 *
 * <p>Generated from V2__care_domain.sql as a starting point; edit freely, it will not
 * be regenerated. Mirrors identity's AppUserJpaEntity: package-private, no domain
 * logic, references to other aggregates are plain ids (DECISION 5 in the schema),
 * so no module depends on another module's persistence classes.
 *
 * <p>The schema is owned by Flyway. Hibernate validates this mapping at start-up
 * and never alters the table.
 */
@Entity
@Table(name = "vital_sign")
class VitalSignJpaEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "visit_id", nullable = false)
	private Long visitId;

	/** systolic, diastolic, pulse, temperature … */
	@Column(name = "metric", nullable = false, length = 50)
	private String metric;

	@Column(name = "value", nullable = false, precision = 8, scale = 2)
	private BigDecimal value;

	@Column(name = "unit", length = 20)
	private String unit;

	/** story C6: highlighted at entry time */
	@Column(name = "out_of_range", nullable = false)
	private boolean outOfRange = false;

	@Column(name = "recorded_at", nullable = false)
	private LocalDateTime recordedAt;

	protected VitalSignJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getVisitId() {
		return visitId;
	}

	void setVisitId(Long visitId) {
		this.visitId = visitId;
	}

	String getMetric() {
		return metric;
	}

	void setMetric(String metric) {
		this.metric = metric;
	}

	BigDecimal getValue() {
		return value;
	}

	void setValue(BigDecimal value) {
		this.value = value;
	}

	String getUnit() {
		return unit;
	}

	void setUnit(String unit) {
		this.unit = unit;
	}

	boolean isOutOfRange() {
		return outOfRange;
	}

	void setOutOfRange(boolean outOfRange) {
		this.outOfRange = outOfRange;
	}

	LocalDateTime getRecordedAt() {
		return recordedAt;
	}

	void setRecordedAt(LocalDateTime recordedAt) {
		this.recordedAt = recordedAt;
	}
}
