package sg.nus.carelink.identity.domain.model;

import jakarta.persistence.Entity;
import sg.nus.carelink.identity.controller.dto.LoginRequest;

/**
 * DELIBERATE FAULT - pipeline verification only. This file must never reach main.
 *
 * It breaks two ArchUnit rules at once:
 *   - a domain class depending on jakarta.persistence
 *   - a domain class depending on the controller layer
 */
public class DeliberateLayerViolation {

	public Class<?> jpaAnnotation() {
		return Entity.class;
	}

	public LoginRequest reachIntoTheWebLayer() {
		return null;
	}
}
